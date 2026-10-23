import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  createCheckoutSession,
  verifySessionStatus,
  validateCouponCode,
  validateReferralCode,
} from '../paymentService';

describe('paymentService', () => {
  it('defines monthly and annual plans priced in AED with Dubai broker perks', () => {
    expect(SUBSCRIPTION_PLANS).toBeDefined();
    expect(SUBSCRIPTION_PLANS.monthly).toBeDefined();
    expect(SUBSCRIPTION_PLANS.annual).toBeDefined();

    expect(SUBSCRIPTION_PLANS.monthly.priceAed).toBe(499);
    expect(SUBSCRIPTION_PLANS.monthly.interval).toBe('month');

    expect(SUBSCRIPTION_PLANS.annual.priceAed).toBe(4990);
    expect(SUBSCRIPTION_PLANS.annual.interval).toBe('year');
    expect(SUBSCRIPTION_PLANS.annual.savingsBadge).toMatch(/2 months free|17%/i);
  });

  it('retrieves subscription plan by planId correctly', () => {
    const monthlyPlan = getSubscriptionPlan('monthly');
    expect(monthlyPlan?.id).toBe('monthly');
    expect(monthlyPlan?.priceAed).toBe(499);

    const annualPlan = getSubscriptionPlan('annual');
    expect(annualPlan?.id).toBe('annual');
    expect(annualPlan?.priceAed).toBe(4990);

    const nonExistent = getSubscriptionPlan('platinum_vip');
    expect(nonExistent).toBeUndefined();
  });

  describe('Coupon & Referral Validation', () => {
    it('validates percentage coupon SPECIAL20 and calculates 20% discount', () => {
      const res = validateCouponCode('SPECIAL20', 499);
      expect(res.valid).toBe(true);
      expect(res.discountAed).toBe(100); // 20% of 499 rounded
    });

    it('validates flat AED coupon VIP100', () => {
      const res = validateCouponCode('vip100', 499);
      expect(res.valid).toBe(true);
      expect(res.discountAed).toBe(100);
    });

    it('validates 100% launch pass LAUNCH100', () => {
      const res = validateCouponCode('LAUNCH100', 499);
      expect(res.valid).toBe(true);
      expect(res.discountAed).toBe(499);
    });

    it('rejects invalid coupon codes with helpful message', () => {
      const res = validateCouponCode('INVALID_CODE', 499);
      expect(res.valid).toBe(false);
      expect(res.discountAed).toBe(0);
      expect(res.errorMessage).toMatch(/invalid or expired/i);
    });

    it('validates broker referral codes and calculates 10% referee discount', () => {
      const res = validateReferralCode('KARIM-DUBAI', 499);
      expect(res.valid).toBe(true);
      expect(res.discountPercent).toBe(10);
      expect(res.discountAed).toBe(50); // 10% of 499 rounded
      expect(res.referrerName).toBe('Karim Al-Sayed');
    });

    it('rejects unrecognized referral codes', () => {
      const res = validateReferralCode('FAKE-CODE', 499);
      expect(res.valid).toBe(false);
      expect(res.errorMessage).toMatch(/invalid/i);
    });
  });

  describe('createCheckoutSession', () => {
    it('creates deterministic sandbox checkout session with Apple Pay support when no gateway key is set', async () => {
      const session = await createCheckoutSession('monthly', 'agent@dubairealty.com');

      expect(session).toBeDefined();
      expect(session.sessionId).toContain('mock_sess_monthly_');
      expect(session.checkoutUrl).toContain('checkout');
      expect(session.checkoutUrl).toContain('monthly');
      expect(session.checkoutUrl).toContain('apple_pay=true');
      expect(session.autoRenew).toBe(true);
    });

    it('passes autoRenew=false and applies coupon discount to session', async () => {
      const session = await createCheckoutSession('monthly', 'agent@dubairealty.com', {
        autoRenew: false,
        couponCode: 'SPECIAL20',
      });

      expect(session.autoRenew).toBe(false);
      expect(session.finalPriceAed).toBe(399);
      expect(session.checkoutUrl).toContain('autorenew=false');
      expect(session.checkoutUrl).toContain('amount=399');
    });

    it('activates directly with 0 AED when 100% discount coupon is applied', async () => {
      const session = await createCheckoutSession('monthly', 'agent@dubairealty.com', {
        couponCode: 'LAUNCH100',
      });

      expect(session.isZeroAed).toBe(true);
      expect(session.finalPriceAed).toBe(0);
      expect(session.checkoutUrl).toBe('');
      expect(session.sessionId).toContain('zero_promo_');
    });

    it('creates annual checkout session with correct plan parameters', async () => {
      const session = await createCheckoutSession('annual', 'broker@emaar-realtors.ae');

      expect(session.sessionId).toContain('mock_sess_annual_');
      expect(session.checkoutUrl).toContain('annual');
    });

    it('throws error when invalid planId is provided', async () => {
      await expect(
        createCheckoutSession('unknown_plan', 'agent@dubai.ae')
      ).rejects.toThrow(/Invalid plan selected/i);
    });

    it('throws error when email is missing or invalid', async () => {
      await expect(
        createCheckoutSession('monthly', '')
      ).rejects.toThrow(/Valid user email is required/i);
    });
  });

  describe('verifySessionStatus', () => {
    it('returns active for valid mock sessions', async () => {
      const status = await verifySessionStatus('mock_sess_monthly_12345');
      expect(status).toBe('active');
    });

    it('returns canceled when sessionId indicates canceled', async () => {
      const status = await verifySessionStatus('mock_sess_canceled_12345');
      expect(status).toBe('canceled');
    });

    it('returns past_due when sessionId indicates past_due', async () => {
      const status = await verifySessionStatus('mock_sess_past_due_12345');
      expect(status).toBe('past_due');
    });

    it('returns inactive when sessionId indicates inactive', async () => {
      const status = await verifySessionStatus('mock_sess_inactive_12345');
      expect(status).toBe('inactive');
    });
  });
});
