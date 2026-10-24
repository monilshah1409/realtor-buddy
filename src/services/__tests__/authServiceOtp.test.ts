import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendEmailOtp,
  verifyEmailOtp,
  registerBroker,
  type RegisterBrokerPayload,
} from '../authService';
import { verifyPaymentTransaction } from '../paymentService';
import { updateLivePropertyStatus, notifyPropertyReviewStatus } from '../propertyService';
import {
  sendEmailViaTemplate,
  getMemoryEmailLogs,
  resetMarketingMemoryStore,
} from '../marketingService';

describe('authService OTP and Registration Integration', () => {
  beforeEach(() => {
    resetMarketingMemoryStore();
  });

  describe('sendEmailOtp', () => {
    it('exposes sendEmailOtp function and returns a boolean status', async () => {
      const res = await sendEmailOtp('broker.test@apexrealty.ae');
      expect(res).toBeDefined();
      expect(typeof res.success).toBe('boolean');
      expect(res.success).toBe(true);
      expect(res.message).toBeDefined();
    });

    it('rejects invalid email formats', async () => {
      const res = await sendEmailOtp('invalid-email-address');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('verifyEmailOtp', () => {
    it('exposes verifyEmailOtp and validates code', async () => {
      const res = await verifyEmailOtp('broker.test@apexrealty.ae', '123456');
      expect(res).toBeDefined();
      expect(typeof res.verified).toBe('boolean');
      expect(res.verified).toBe(true);
      expect(res.success).toBe(true);
    });

    it('rejects code 000000 in mock mode for error testing', async () => {
      const res = await verifyEmailOtp('broker.test@apexrealty.ae', '000000');
      expect(res.verified).toBe(false);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid');
    });

    it('rejects empty code', async () => {
      const res = await verifyEmailOtp('broker.test@apexrealty.ae', '');
      expect(res.verified).toBe(false);
      expect(res.success).toBe(false);
    });
  });

  describe('registerBroker OTP gating', () => {
    it('rejects registration when email is not verified (otpVerified is undefined or false)', async () => {
      const payload: RegisterBrokerPayload = {
        fullName: 'Rashid Al-Falasi',
        agencyName: 'Gulf Luxury',
        email: 'rashid@gulfluxury.ae',
        whatsappNumber: '+971501112233',
        otpVerified: false,
      };

      const res = await registerBroker(payload);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Email verification required');
    });

    it('rejects registration when otpVerified is omitted', async () => {
      const payload: RegisterBrokerPayload = {
        fullName: 'Rashid Al-Falasi',
        agencyName: 'Gulf Luxury',
        email: 'rashid@gulfluxury.ae',
        whatsappNumber: '+971501112233',
      };

      const res = await registerBroker(payload);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Email verification required');
    });

    it('succeeds registration when otpVerified is true and sets email_verified = true', async () => {
      const payload: RegisterBrokerPayload = {
        fullName: 'Rashid Al-Falasi',
        agencyName: 'Gulf Luxury',
        email: 'rashid@gulfluxury.ae',
        whatsappNumber: '+971501112233',
        otpVerified: true,
      };

      const res = await registerBroker(payload);
      expect(res.success).toBe(true);
      expect(res.profile).toBeDefined();
      expect(res.profile?.email_verified).toBe(true);
      expect(res.profile?.subscription_status).toBe('trial');

      // Verifies broker_welcome_trial was dispatched
      const logs = getMemoryEmailLogs();
      const welcomeEmail = logs.find((l) => l.campaign_type === 'broker_welcome_trial');
      expect(welcomeEmail).toBeDefined();
      expect(welcomeEmail?.recipient_email).toContain('rashid@gulfluxury.ae');
    });
  });

  describe('paymentService transactional triggers', () => {
    it('triggers payment_receipt email when payment confirms as paid', async () => {
      const result = await verifyPaymentTransaction({
        sessionId: 'mock_sess_monthly_12345',
        userEmail: 'elena.rostova@skyline.ae',
        brokerName: 'Elena Rostova',
        amountAed: 149,
      });

      expect(result.status).toBe('paid');
      expect(result.subscriptionStatus).toBe('active');
      expect(result.receiptSent).toBe(true);
      expect(result.invoiceId).toBeDefined();

      const logs = getMemoryEmailLogs();
      const receiptLog = logs.find((l) => l.campaign_type === 'payment_receipt');
      expect(receiptLog).toBeDefined();
      expect(receiptLog?.recipient_email).toContain('elena.rostova@skyline.ae');
    });

    it('does not send receipt email when payment is canceled or past_due', async () => {
      const result = await verifyPaymentTransaction({
        sessionId: 'mock_sess_canceled_12345',
        userEmail: 'canceled.broker@skyline.ae',
      });

      expect(result.status).toBe('canceled');
      expect(result.receiptSent).toBe(false);
    });
  });

  describe('propertyService transactional triggers', () => {
    it('dispatches property_review_status email on listing approval', async () => {
      const res = await notifyPropertyReviewStatus({
        propertyTitle: 'Habtoor Grand Residences',
        brokerEmail: 'broker.listing@apex.ae',
        status: 'approved',
        feedback: 'All documents verified.',
      });

      expect(res.success).toBe(true);
      const logs = getMemoryEmailLogs();
      const reviewLog = logs.find((l) => l.campaign_type === 'property_review_status');
      expect(reviewLog).toBeDefined();
      expect(reviewLog?.recipient_email).toContain('broker.listing@apex.ae');
      expect(reviewLog?.subject).toContain('Habtoor Grand Residences');
    });

    it('dispatches property_review_status email via updateLivePropertyStatus options', async () => {
      const success = await updateLivePropertyStatus('prop-12345', 'global', {
        brokerEmail: 'broker.direct@apex.ae',
        propertyTitle: 'Creek Waters 2',
        feedback: 'Approved for VIP directory',
      });

      expect(success).toBe(true);
      const logs = getMemoryEmailLogs();
      const reviewLog = logs.find((l) => l.recipient_email.includes('broker.direct@apex.ae'));
      expect(reviewLog).toBeDefined();
      expect(reviewLog?.campaign_type).toBe('property_review_status');
    });
  });

  describe('marketingService sendEmailViaTemplate helper', () => {
    it('dispatches template emails and records in email logs', async () => {
      const res = await sendEmailViaTemplate({
        to: ['concierge.vip@skyline.ae'],
        template: 'trial_day_3',
        subject: 'Discover Off-Plan Wholesale Pricing',
        data: { broker_name: 'Karim Al-Sayed' },
      });

      expect(res.success).toBe(true);
      expect(res.dispatchedCount).toBe(1);

      const logs = getMemoryEmailLogs();
      const log = logs.find((l) => l.recipient_email.includes('concierge.vip@skyline.ae'));
      expect(log).toBeDefined();
      expect(log?.campaign_type).toBe('trial_day_3');
    });
  });
});
