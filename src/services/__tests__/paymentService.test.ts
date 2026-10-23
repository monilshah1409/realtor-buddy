import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  createCheckoutSession,
  verifySessionStatus,
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

  describe('createCheckoutSession', () => {
    it('creates deterministic sandbox checkout session with Apple Pay support when no gateway key is set', async () => {
      const session = await createCheckoutSession('monthly', 'agent@dubairealty.com');

      expect(session).toBeDefined();
      expect(session.sessionId).toContain('mock_sess_monthly_');
      expect(session.checkoutUrl).toContain('checkout');
      expect(session.checkoutUrl).toContain('monthly');
      expect(session.checkoutUrl).toContain('apple_pay=true');
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
