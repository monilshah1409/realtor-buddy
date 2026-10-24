import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleEmailDispatcherRequest,
  clearInMemoryBrokerOtps,
  inMemoryBrokerOtps,
  setCustomSupabaseAdmin,
} from '../../../supabase/functions/email-dispatcher/index';

describe('OTP Generation, Verification & Edge Function Route Authorization', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof clearInMemoryBrokerOtps === 'function') {
      clearInMemoryBrokerOtps();
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).Deno;
  });

  describe('action: send_otp (Public Endpoint & Rate Limiting)', () => {
    it('generates a 6-digit OTP code, stores record, and returns success', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email: 'newbroker@apexrealty.ae',
          purpose: 'verification',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.action).toBe('send_otp');
      expect(body.message).toContain('Verification code sent');
      expect(body.code).toBeUndefined();

      // Verify in-memory record was created
      expect(inMemoryBrokerOtps.length).toBe(1);
      const record = inMemoryBrokerOtps[0];
      expect(record.email).toBe('newbroker@apexrealty.ae');
      expect(record.otp_code).toBeDefined();
      expect(record.otp_code).toMatch(/^\d{6}$/);
      expect(record.attempts).toBe(0);
      expect(record.max_attempts).toBe(5);
      expect(record.consumed_at).toBeNull();
      expect(new Date(record.expires_at).getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects send_otp when email is missing or invalid with 400', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email: 'not-an-email',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('email');
    });

    it('enforces strict rate limiting: allows max 3 requests/hour and returns 429 on 4th', async () => {
      const email = 'broker.ratelimit@skyline.ae';

      // Send 3 OTP requests in succession
      for (let i = 1; i <= 3; i++) {
        const req = new Request('http://localhost/functions/v1/email-dispatcher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_otp',
            email,
          }),
        });

        const res = await handleEmailDispatcherRequest(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
      }

      // 4th request must be blocked by rate limit
      const fourthReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email,
        }),
      });

      const fourthRes = await handleEmailDispatcherRequest(fourthReq);
      expect(fourthRes.status).toBe(429);
      const fourthBody = await fourthRes.json();
      expect(fourthBody.error).toContain('Rate limit exceeded');
      expect(fourthBody.error).toContain('3');
    });
  });

  describe('action: verify_otp (Public Endpoint & Brute-Force Guard)', () => {
    it('verifies valid OTP, marks record as consumed, and returns verified: true', async () => {
      const email = 'verify.success@marinaestates.ae';

      // 1. Send OTP
      const sendReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email,
        }),
      });
      const sendRes = await handleEmailDispatcherRequest(sendReq);
      expect(sendRes.status).toBe(200);
      const code = inMemoryBrokerOtps[0].otp_code;

      // 2. Verify with correct code
      const verifyReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp_code: code,
        }),
      });

      const verifyRes = await handleEmailDispatcherRequest(verifyReq);
      expect(verifyRes.status).toBe(200);
      const verifyBody = await verifyRes.json();
      expect(verifyBody.success).toBe(true);
      expect(verifyBody.verified).toBe(true);
      expect(verifyBody.message).toContain('verified');

      // 3. Trying to verify again fails since it has been consumed
      const repeatReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp_code: code,
        }),
      });
      const repeatRes = await handleEmailDispatcherRequest(repeatReq);
      expect(repeatRes.status).toBe(400);
      const repeatBody = await repeatRes.json();
      expect(repeatBody.verified).toBe(false);
      expect(repeatBody.error).toContain('expired or invalid');
    });

    it('increments attempts on wrong code and blocks after 5 failed attempts', async () => {
      const email = 'bruteforce.broker@apexrealty.ae';

      // 1. Send OTP
      const sendReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email,
        }),
      });
      const sendRes = await handleEmailDispatcherRequest(sendReq);
      expect(sendRes.status).toBe(200);
      const correctCode = inMemoryBrokerOtps[0].otp_code;

      // 2. Submit wrong code 4 times
      for (let attempt = 1; attempt <= 4; attempt++) {
        const wrongReq = new Request('http://localhost/functions/v1/email-dispatcher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify_otp',
            email,
            otp_code: '000000',
          }),
        });
        const wrongRes = await handleEmailDispatcherRequest(wrongReq);
        expect(wrongRes.status).toBe(400);
        const wrongBody = await wrongRes.json();
        expect(wrongBody.verified).toBe(false);
        expect(wrongBody.error).toBe('Incorrect verification code');
        expect(inMemoryBrokerOtps[0].attempts).toBe(attempt);
      }

      // 3. 5th failed attempt reaches maximum attempts
      const fifthReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp_code: '000000',
        }),
      });
      const fifthRes = await handleEmailDispatcherRequest(fifthReq);
      expect(fifthRes.status).toBe(400);
      const fifthBody = await fifthRes.json();
      expect(fifthBody.verified).toBe(false);
      expect(fifthBody.error).toContain('Maximum attempts exceeded');

      // 4. Subsequent attempt even with the correct code is rejected
      const lockedReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp_code: correctCode,
        }),
      });
      const lockedRes = await handleEmailDispatcherRequest(lockedReq);
      expect(lockedRes.status).toBe(400);
      const lockedBody = await lockedRes.json();
      expect(lockedBody.verified).toBe(false);
      expect(lockedBody.error).toContain('Maximum attempts exceeded');
    });

    it('rejects expired OTP codes with 400', async () => {
      const email = 'expired.broker@apexrealty.ae';

      // 1. Send OTP
      const sendReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email,
        }),
      });
      const sendRes = await handleEmailDispatcherRequest(sendReq);
      expect(sendRes.status).toBe(200);
      const code = inMemoryBrokerOtps[0].otp_code;

      // 2. Artificially expire the stored OTP (15 minutes in the past)
      expect(inMemoryBrokerOtps.length).toBe(1);
      inMemoryBrokerOtps[0].expires_at = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      // 3. Verify attempt fails due to expiry
      const verifyReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email,
          otp_code: code,
        }),
      });
      const verifyRes = await handleEmailDispatcherRequest(verifyReq);
      expect(verifyRes.status).toBe(400);
      const verifyBody = await verifyRes.json();
      expect(verifyBody.verified).toBe(false);
      expect(verifyBody.error).toContain('expired or invalid');
    });

    it('rejects verify_otp when code or email is missing', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email: 'broker@apex.ae',
          otp_code: '',
        }),
      });
      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.verified).toBe(false);
      expect(body.error).toContain('code');
    });
  });

  describe('Route Authorization Guard', () => {
    it('allows public access to send_otp and verify_otp without authorization header even when auth is required', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      // send_otp without auth header
      const sendReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email: 'public.broker@apex.ae',
        }),
      });
      const sendRes = await handleEmailDispatcherRequest(sendReq);
      expect(sendRes.status).toBe(200);

      const code = inMemoryBrokerOtps[0].otp_code;

      // verify_otp without auth header
      const verifyReq = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email: 'public.broker@apex.ae',
          otp_code: code,
        }),
      });
      const verifyRes = await handleEmailDispatcherRequest(verifyReq);
      expect(verifyRes.status).toBe(200);
      const verifyBody = await verifyRes.json();
      expect(verifyBody.verified).toBe(true);
    });

    it('blocks mass broadcast with 401 when Authorization header is missing and auth is required', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_email',
          audience: 'all',
          subject: 'Unauthorized Mass Blast',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Unauthorized');
    });

    it('blocks mass broadcast with 403 when Authorization token is invalid', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid_unauthorized_token',
        },
        body: JSON.stringify({
          action: 'send_email',
          audience: 'all',
          subject: 'Forbidden Mass Blast',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden');
    });

    it('allows mass broadcast when valid service role key is provided in Authorization header', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_service_key_999',
        },
        body: JSON.stringify({
          action: 'send_email',
          audience: 'trial',
          subject: 'Authorized VIP Blast',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.audience).toBe('trial');
    });

    it('rejects mass broadcast with 403 when user email contains "admin" but role is not admin [H1 privilege escalation guard]', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      setCustomSupabaseAdmin({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'impostor-1',
                email: 'notanadmin@realtorbuddy.ae',
                role: 'agent',
                app_metadata: { role: 'agent' },
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer user_token_impostor',
        },
        body: JSON.stringify({
          action: 'send_email',
          audience: 'all',
          subject: 'Attempted Impostor Broadcast',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden: Admin access required');
    });

    it('permits single-recipient transactional emails for authenticated non-admin brokers [H2 transactional email]', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      setCustomSupabaseAdmin({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'agent-123',
                email: 'broker.agent@apexrealty.ae',
                role: 'agent',
                app_metadata: { role: 'agent' },
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer agent_valid_token',
        },
        body: JSON.stringify({
          action: 'send_email',
          to: ['newbuyer@client.ae'],
          template: 'broker_welcome_trial',
          subject: 'Welcome to Realtor Buddy VIP',
          data: { broker_name: 'Ahmed', trial_days: 5 },
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.dispatchedCount).toBe(1);
    });

    it('blocks non-admin brokers from sending multi-recipient emails with 403 [H2 broadcast guard]', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_URL') return 'https://test.supabase.co';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      setCustomSupabaseAdmin({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'agent-123',
                email: 'broker.agent@apexrealty.ae',
                role: 'agent',
                app_metadata: { role: 'agent' },
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer agent_valid_token',
        },
        body: JSON.stringify({
          action: 'send_email',
          to: ['recipient1@apex.ae', 'recipient2@apex.ae'],
          template: 'broker_welcome_trial',
          subject: 'Unauthorized Multi-Recipient Blast',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Forbidden: Admin access required');
    });

    it('permits single-recipient transactional email for system calls without authorization header [H2 transactional system call]', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'REQUIRE_AUTH') return 'true';
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test_service_key_999';
            return undefined;
          },
        },
      };

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_email',
          to: ['payingbroker@marinaestates.ae'],
          template: 'payment_receipt',
          subject: 'Receipt for Subscription',
          data: { amount_aed: 499 },
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.dispatchedCount).toBe(1);
    });
  });
});
