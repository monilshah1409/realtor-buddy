import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleEmailDispatcherRequest,
  generateLuxuryEmailHtml,
  corsHeaders,
  setCustomSupabaseAdmin,
} from '../../../supabase/functions/email-dispatcher/index';

describe('email-dispatcher Supabase Edge Function', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).Deno;
    setCustomSupabaseAdmin(null);
  });

  describe('CORS & Method Validation', () => {
    it('handles OPTIONS preflight requests with CORS headers', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'OPTIONS',
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
      const text = await res.text();
      expect(text).toBe('ok');
    });

    it('rejects non-POST HTTP methods with 405', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'GET',
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(405);
      const json = await res.json();
      expect(json.error).toContain('Method not allowed');
    });
  });

  describe('Payload Validation', () => {
    it('returns 400 when JSON body is malformed', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-{',
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid JSON payload');
    });

    it('returns 400 with expected error message when subject is missing', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'all',
          subject: '',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing subject or recipient audience');
    });

    it('returns 400 when both audience and to array are missing', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Exclusive Launch Announcement',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing subject or recipient audience');
    });
  });

  describe('Audience Resolution & Logger Fallback', () => {
    it('resolves direct "to" recipients and returns provider: logger', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['vip.broker@apexrealty.ae', 'partner@skyline.ae'],
          subject: 'Direct VIP Brochure Dispatch',
          htmlContent: '<p>Direct investor brochure preview.</p>',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.dispatchedCount).toBe(2);
      expect(json.provider).toBe('logger');
      expect(json.audience).toBe('custom');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[EMAIL-DISPATCHER: MOCK DISPATCH]',
        expect.objectContaining({
          subject: 'Direct VIP Brochure Dispatch',
          recipientCount: 2,
        })
      );
    });

    it('resolves audience segments (trial / active / expired) with mock fallback', async () => {
      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'trial',
          subject: 'Trial Expiration Notice',
          template: 'trial_expiring_24h',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.provider).toBe('logger');
      expect(json.audience).toBe('trial');
      expect(json.dispatchedCount).toBeGreaterThan(0);
    });

    it('queries both expired status and expired trials when audience is expired [M3]', async () => {
      let orClause = '';
      setCustomSupabaseAdmin({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          or: vi.fn().mockImplementation((clause: string) => {
            orClause = clause;
            return Promise.resolve({
              data: [
                { email: 'expired.paid@apex.ae' },
                { email: 'expired.trial@apex.ae' },
              ],
              error: null,
            });
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'expired',
          subject: 'Exclusive Winback',
          template: 'trial_expired_winback',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.dispatchedCount).toBe(2);
      expect(orClause).toContain('subscription_status.eq.expired');
      expect(orClause).toContain('subscription_status.eq.trial');
      expect(orClause).toContain('trial_expires_at.lte');
    });
  });

  describe('Resend Provider Integration', () => {
    it('calls Resend API endpoint when RESEND_API_KEY environment variable is present', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'RESEND_API_KEY') return 're_test_dummy_key_123';
            return undefined;
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email_resend_999' }),
      });
      globalThis.fetch = mockFetch;

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['broker@luxury.ae'],
          subject: 'VIP Developer Allocation',
          htmlContent: '<p>Off-plan allocation secured.</p>',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.provider).toBe('resend');
      expect(json.dispatchedCount).toBe(1);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_dummy_key_123',
          }),
        })
      );
    });

    it('returns HTTP 500 when Resend API returns an error response', async () => {
      (globalThis as any).Deno = {
        env: {
          get: (key: string) => {
            if (key === 'RESEND_API_KEY') return 're_invalid_key';
            return undefined;
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized API key',
      });
      globalThis.fetch = mockFetch;

      const req = new Request('http://localhost/functions/v1/email-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['broker@luxury.ae'],
          subject: 'Test Subject',
          htmlContent: '<p>Content</p>',
        }),
      });

      const res = await handleEmailDispatcherRequest(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.provider).toBe('resend');
      expect(json.error).toContain('Resend error (401)');
    });
  });

  describe('Luxury Dubai HTML Email Template Generator', () => {
    it('renders Obsidian Noir (#090D15), Champagne Gold (#D4AF37), and Cinzel typography', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Palm Jumeirah Off-Plan Launch',
        htmlContent: '<p>Exclusive duplex penthouse preview.</p>',
      });

      expect(html).toContain('#090D15'); // Obsidian Noir
      expect(html).toContain('#D4AF37'); // Champagne Gold
      expect(html).toContain('#FAF8F5'); // Warm Alabaster
      expect(html).toContain('Cinzel'); // Luxury header typography
      expect(html).toContain('REALTOR BUDDY');
      expect(html).toContain('DUBAI OFF-PLAN INTELLIGENCE');
      expect(html).toContain('Exclusive duplex penthouse preview.');
      expect(html).toContain('Palm Jumeirah Off-Plan Launch');
    });

    it('renders built-in trial_expired_winback template with code replacement', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Claim 20% Partner Discount',
        template: 'trial_expired_winback',
        data: { promo_code: 'VIPDUBAI20' },
      });

      expect(html).toContain('VIPDUBAI20');
      expect(html).toContain('Exclusive Partner Offer: 20% Off Your Membership');
      expect(html).toContain('REDEEM 20% SAVINGS');
    });

    it('interpolates template data variables', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Welcome Broker',
        htmlContent: '<p>Hello {{broker_name}}, your agency is {{agency}}.</p>',
        data: {
          broker_name: 'Rashid Al Maktoum',
          agency: 'Apex Elite Realty',
        },
      });

      expect(html).toContain('Hello Rashid Al Maktoum, your agency is Apex Elite Realty.');
    });
  });
});
