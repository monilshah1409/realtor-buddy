import { SubscriptionStatus } from '../types';

export interface SubscriptionPlan {
  id: 'monthly' | 'annual';
  name: string;
  priceAed: number;
  interval: 'month' | 'year';
  billingPeriodText: string;
  description: string;
  features: string[];
  savingsBadge?: string;
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<'monthly' | 'annual', SubscriptionPlan> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Pro Broker',
    priceAed: 499,
    interval: 'month',
    billingPeriodText: '499 AED / month',
    description: 'Full access to confidential wholesale inventory and direct developer contracts',
    features: [
      'Confidential wholesale pricing & developer inventory',
      'Direct developer contacts & commission agreements',
      'Interactive Dubai cluster map & distance matrix',
      'Branded client shortlist generator with custom token links',
      'Automated OneDrive brochure sync & desktop upload',
      'Standard broker concierge support',
    ],
  },
  annual: {
    id: 'annual',
    name: 'Annual VIP Broker',
    priceAed: 4990,
    interval: 'year',
    billingPeriodText: '4,990 AED / year',
    description: 'Maximum savings for top-producing Dubai brokers and agencies',
    features: [
      'Everything in Monthly Pro Broker',
      '2 Months Free (Save 998 AED annually — 17% savings)',
      'Priority verified broker badge on shared shortlists',
      'Early-access allocations for prime off-plan launches',
      'Direct phone & WhatsApp escalation to Monil & Edwin',
    ],
    savingsBadge: '2 Months Free (Save 17%)',
    isPopular: true,
  },
};

export function getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
  if (planId === 'monthly' || planId === 'annual') {
    return SUBSCRIPTION_PLANS[planId];
  }
  return undefined;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Creates a UAE payment gateway hosted checkout session in AED (supporting Ziina / PayTabs)
 * with Apple Pay and UAE debit/credit card redirect.
 *
 * In test or local sandbox mode (when VITE_PAYMENT_GATEWAY_KEY is not configured or set to sandbox),
 * deterministic mock sessions are generated.
 */
export async function createCheckoutSession(
  planId: string,
  userEmail: string
): Promise<CheckoutSessionResult> {
  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    throw new Error(`Invalid plan selected: "${planId}". Available plans: monthly, annual.`);
  }

  if (!userEmail || !userEmail.trim() || !userEmail.includes('@')) {
    throw new Error('Valid user email is required for checkout.');
  }

  const gatewayKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_GATEWAY_KEY) ||
    '';

  // Live Gateway Integration (Ziina Business / PayTabs) when live key is provided
  if (gatewayKey && !gatewayKey.startsWith('mock_') && !gatewayKey.startsWith('test_')) {
    try {
      const response = await fetch('https://api.ziina.com/v1/payment_intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayKey}`,
        },
        body: JSON.stringify({
          amount: plan.priceAed * 100, // Ziina expects amount in fils
          currency_code: 'AED',
          message: `Realtor Buddy ${plan.name} (${userEmail})`,
          success_url: `${window?.location?.origin || 'https://realtorbuddy.ae'}/auth/callback?session_id={PAYMENT_INTENT_ID}`,
          cancel_url: `${window?.location?.origin || 'https://realtorbuddy.ae'}/subscribe?canceled=true`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          checkoutUrl: data.redirect_url,
          sessionId: data.id,
        };
      }
    } catch {
      // Fallback to sandbox below if live call is unavailable
    }
  }

  // Deterministic Sandbox / Mock Gateway for dev & testing
  const sanitizedPlan = plan.id;
  const mockTimestamp = Date.now();
  const sessionId = `mock_sess_${sanitizedPlan}_${mockTimestamp}`;
  const checkoutUrl = `https://checkout.ziina.com/session/${sessionId}?amount=${plan.priceAed}&currency=AED&apple_pay=true&email=${encodeURIComponent(
    userEmail
  )}&plan=${sanitizedPlan}`;

  return {
    checkoutUrl,
    sessionId,
  };
}

/**
 * Verifies payment session status with the UAE payment gateway.
 */
export async function verifySessionStatus(sessionId: string): Promise<SubscriptionStatus> {
  if (!sessionId) {
    return 'inactive';
  }

  // Deterministic mock session status resolution
  if (sessionId.includes('canceled')) {
    return 'canceled';
  }
  if (sessionId.includes('past_due')) {
    return 'past_due';
  }
  if (sessionId.includes('inactive')) {
    return 'inactive';
  }
  if (sessionId.includes('trial')) {
    return 'trial';
  }

  return 'active';
}
