import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateLuxuryEmailHtml,
  handleEmailDispatcherRequest,
} from '../../../supabase/functions/email-dispatcher/index';
import nodemailer from 'npm:nodemailer@^6.9.16';

describe('Luxury Email Templates Suite', () => {
  describe('Template 1: otp_verification', () => {
    it('renders otp_verification template with highlighted 6-digit code and expiry warning', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Your Verification Code',
        template: 'otp_verification',
        data: { code: '849201', expiry_minutes: 10 },
      });
      expect(html).toContain('849201');
      expect(html).toContain('REALTOR BUDDY');
      expect(html).toContain('#D4AF37');
      expect(html).toContain('10 minutes');
      expect(html).toContain('Broker Verification Code');
    });

    it('uses default 10 minutes expiry if expiry_minutes is omitted', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Your Verification Code',
        template: 'otp_verification',
        data: { code: '123456' },
      });
      expect(html).toContain('123456');
      expect(html).toContain('10 minutes');
    });
  });

  describe('Template 2: broker_welcome_trial', () => {
    it('renders broker_welcome_trial with 5-day trial details and CTA', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Welcome to Realtor Buddy VIP',
        template: 'broker_welcome_trial',
        data: { broker_name: 'Tariq Al-Mansoor', trial_days: 5 },
      });
      expect(html).toContain('Tariq Al-Mansoor');
      expect(html).toContain('5-Day Complimentary Trial');
      expect(html).toContain('EXPLORE OFF-PLAN INVENTORY');
      expect(html).toContain('https://realtorbuddy.ae/app/off-plan');
    });
  });

  describe('Template 3: trial_day_3', () => {
    it('renders trial_day_3 feature discovery template', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Unlock Wholesale Off-Plan Pricing',
        template: 'trial_day_3',
      });
      expect(html).toContain('Unlock Exclusive Wholesale Off-Plan Pricing');
      expect(html).toContain('PDF brochures');
      expect(html).toContain('EXPLORE OFF-PLAN INVENTORY');
    });
  });

  describe('Template 4: trial_expiring_24h', () => {
    it('renders trial_expiring_24h urgency notice with 149 AED continuation link', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Your VIP Access Expires in 24 Hours',
        template: 'trial_expiring_24h',
      });
      expect(html).toContain('Your VIP Trial Expires in 24 Hours');
      expect(html).toContain('149 AED/month');
      expect(html).toContain('CONTINUE VIP MEMBERSHIP (149 AED/MO)');
      expect(html).toContain('https://realtorbuddy.ae/app/subscribe');
    });
  });

  describe('Template 5: trial_expired_winback', () => {
    it('renders trial_expired_winback with promo code SPECIAL20 and discount link', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Exclusive Partner Offer: 20% Off',
        template: 'trial_expired_winback',
        data: { promo_code: 'SPECIAL20' },
      });
      expect(html).toContain('SPECIAL20');
      expect(html).toContain('Exclusive Partner Offer: 20% Off Your Membership');
      expect(html).toContain('REDEEM 20% SAVINGS');
    });
  });

  describe('Template 6: payment_receipt', () => {
    it('renders payment_receipt with 149 AED and invoice reference', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Payment Confirmation & Receipt',
        template: 'payment_receipt',
        data: {
          invoice_id: 'INV-2026-904',
          amount_aed: 149,
          broker_name: 'Elena Rostova',
          payment_method: 'Ziina Pay',
        },
      });
      expect(html).toContain('INV-2026-904');
      expect(html).toContain('149 AED');
      expect(html).toContain('Elena Rostova');
      expect(html).toContain('VIP Membership Confirmation & Receipt');
      expect(html).toContain('Ziina Pay');
    });
  });

  describe('Template 7: property_review_status', () => {
    it('renders property_review_status with approval status and feedback', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Listing Approved',
        template: 'property_review_status',
        data: {
          property_title: 'Habtoor Grand Residences',
          status: 'approved',
          feedback: 'All luxury floor plans and commission details have been verified.',
        },
      });
      expect(html).toContain('Habtoor Grand Residences');
      expect(html).toContain('approved');
      expect(html).toContain('All luxury floor plans and commission details have been verified.');
      expect(html).toContain('Off-Plan Listing Status Update');
    });

    it('renders changes requested status with guidance for broker', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Listing Action Required',
        template: 'property_review_status',
        data: {
          property_title: 'Palm Jumeirah Signature Villa',
          status: 'changes requested',
          feedback: 'Please update payment plan milestones.',
        },
      });
      expect(html).toContain('Palm Jumeirah Signature Villa');
      expect(html).toContain('changes requested');
      expect(html).toContain('Please update payment plan milestones.');
    });
  });

  describe('Template 8: admin_broadcast', () => {
    it('renders admin_broadcast with custom headline, message, and CTA', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Q4 Dubai Real Estate Market Brief',
        template: 'admin_broadcast',
        data: {
          headline: 'Record Off-Plan Sales Across Dubai Marina',
          message: 'Over 12,000 off-plan registrations recorded this quarter.',
          cta_label: 'VIEW MARKET REPORT',
          cta_url: 'https://realtorbuddy.ae/reports/q4',
        },
      });
      expect(html).toContain('Record Off-Plan Sales Across Dubai Marina');
      expect(html).toContain('Over 12,000 off-plan registrations recorded this quarter.');
      expect(html).toContain('VIEW MARKET REPORT');
      expect(html).toContain('https://realtorbuddy.ae/reports/q4');
    });
  });

  describe('Variable Interpolation & Fallback Resilience', () => {
    it('interpolates variables with spaces in mustache delimiters {{ key }}', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Custom Template Test',
        htmlContent: '<p>VIP Broker: {{ broker_name }} - Unit: {{ unit }}</p>',
        data: {
          broker_name: 'Saeed Al-Maktoum',
          unit: 'PH-402',
        },
      });
      expect(html).toContain('VIP Broker: Saeed Al-Maktoum - Unit: PH-402');
    });

    it('falls back safely when template data is missing or undefined', () => {
      const html = generateLuxuryEmailHtml({
        subject: 'Payment Confirmation',
        template: 'payment_receipt',
        data: {},
      });
      expect(html).toContain('149 AED');
      expect(html).toContain('VIP Membership Confirmation & Receipt');
      expect(html).not.toContain('undefined');
    });
  });
});

describe('Nodemailer SMTP Delivery Engine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).Deno;
  });

  it('initializes Nodemailer transport and sends email when SMTP credentials exist', async () => {
    (globalThis as any).Deno = {
      env: {
        get: (key: string) => {
          if (key === 'SMTP_HOST') return 'smtp.hostinger.com';
          if (key === 'SMTP_PORT') return '465';
          if (key === 'SMTP_SECURE') return 'true';
          if (key === 'SMTP_USER') return 'concierge@realtorbuddy.ae';
          if (key === 'SMTP_PASS') return 'SuperSecretSmtpPass!123';
          if (key === 'SMTP_FROM') return '"Realtor Buddy VIP" <concierge@realtorbuddy.ae>';
          return undefined;
        },
      },
    };

    const req = new Request('http://localhost/functions/v1/email-dispatcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ['broker@luxurydubai.ae'],
        subject: 'Direct SMTP Delivery Test',
        template: 'otp_verification',
        data: { code: '918273' },
      }),
    });

    const res = await handleEmailDispatcherRequest(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.provider).toBe('nodemailer');
    expect(json.dispatchedCount).toBe(1);
  });

  it('falls back to logger provider when SMTP credentials are not configured', async () => {
    (globalThis as any).Deno = {
      env: {
        get: (_key: string) => undefined,
      },
    };

    const req = new Request('http://localhost/functions/v1/email-dispatcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ['offline.broker@apex.ae'],
        subject: 'Offline Test Delivery',
        htmlContent: '<p>Offline mode test</p>',
      }),
    });

    const res = await handleEmailDispatcherRequest(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.provider).toBe('logger');
  });
});
