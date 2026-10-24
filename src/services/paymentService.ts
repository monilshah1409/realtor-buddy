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

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed_aed';
  discountValue: number;
  description: string;
}

export const PRESET_COUPONS: Record<string, Coupon> = {
  SPECIAL20: {
    code: 'SPECIAL20',
    discountType: 'percentage',
    discountValue: 20,
    description: '20% Special Partner Discount',
  },
  VIP100: {
    code: 'VIP100',
    discountType: 'fixed_aed',
    discountValue: 100,
    description: '100 AED Flat VIP Voucher',
  },
  LAUNCH100: {
    code: 'LAUNCH100',
    discountType: 'percentage',
    discountValue: 100,
    description: '100% Launch Pass (Free Trial Activation)',
  },
};

export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountAed: number;
  description?: string;
  errorMessage?: string;
}

export function validateCouponCode(
  rawCode: string,
  basePriceAed: number
): CouponValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, discountAed: 0, errorMessage: 'Please enter a coupon code.' };
  }

  const coupon = PRESET_COUPONS[code];
  if (!coupon) {
    return {
      valid: false,
      discountAed: 0,
      errorMessage: 'Coupon code is invalid or expired.',
    };
  }

  let discountAed = 0;
  if (coupon.discountType === 'percentage') {
    discountAed = Math.round((basePriceAed * coupon.discountValue) / 100);
  } else if (coupon.discountType === 'fixed_aed') {
    discountAed = Math.min(basePriceAed, coupon.discountValue);
  }

  return {
    valid: true,
    code: coupon.code,
    discountAed,
    description: coupon.description,
  };
}

export interface ReferralValidationResult {
  valid: boolean;
  code?: string;
  referrerName?: string;
  discountAed: number;
  discountPercent: number;
  errorMessage?: string;
}

const PRESET_REFERRALS: Record<string, { referrerName: string; discountPercent: number }> = {
  'KARIM-DUBAI': { referrerName: 'Karim Al-Sayed', discountPercent: 10 },
  'MONIL-VIP': { referrerName: 'Monil & Edwin HQ', discountPercent: 15 },
  'EMAAR-AGENT': { referrerName: 'Emaar Signature Partner', discountPercent: 10 },
};

export function validateReferralCode(
  rawCode: string,
  basePriceAed: number
): ReferralValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      discountAed: 0,
      discountPercent: 0,
      errorMessage: 'Please enter a referral code.',
    };
  }

  const ref = PRESET_REFERRALS[code];
  if (!ref) {
    return {
      valid: false,
      discountAed: 0,
      discountPercent: 0,
      errorMessage: 'Invalid referral code. Please check with your referring broker.',
    };
  }

  const discountAed = Math.round((basePriceAed * ref.discountPercent) / 100);

  return {
    valid: true,
    code,
    referrerName: ref.referrerName,
    discountAed,
    discountPercent: ref.discountPercent,
  };
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
  finalPriceAed: number;
  isZeroAed: boolean;
  autoRenew: boolean;
}

export interface CheckoutOptions {
  autoRenew?: boolean;
  couponCode?: string;
  referralCode?: string;
}

/**
 * Creates a payment session with the UAE Ziina Payment Gateway (or test sandbox).
 * 
 * Exact Ziina Specification:
 * - Endpoint: https://api-v2.ziina.com/api/payment_intent
 * - Amount: in fils (100 AED = 10,000 fils). Minimum 2 AED (200 fils).
 * - Parameters: currency_code ('AED'), message, success_url, cancel_url, test (boolean).
 * - Returns: redirect_url (to access Ziina payment page) and id.
 */
export async function createCheckoutSession(
  planId: string,
  userEmail: string,
  options: CheckoutOptions = {}
): Promise<CheckoutSessionResult> {
  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    throw new Error(`Invalid plan selected: "${planId}". Expected "monthly" or "annual".`);
  }

  if (!userEmail || !userEmail.includes('@')) {
    throw new Error('Valid user email is required to initiate checkout.');
  }

  const autoRenew = options.autoRenew !== undefined ? options.autoRenew : true;

  // Apply discounts
  let totalDiscountAed = 0;
  if (options.couponCode) {
    const couponRes = validateCouponCode(options.couponCode, plan.priceAed);
    if (couponRes.valid) {
      totalDiscountAed += couponRes.discountAed;
    }
  }
  if (options.referralCode) {
    const refRes = validateReferralCode(options.referralCode, plan.priceAed);
    if (refRes.valid) {
      totalDiscountAed += refRes.discountAed;
    }
  }

  const finalPriceAed = Math.max(0, plan.priceAed - totalDiscountAed);

  // If 100% discount is applied (0 AED due), direct instant activation without gateway redirect!
  if (finalPriceAed === 0) {
    const zeroSessionId = `zero_promo_${Date.now()}`;
    return {
      checkoutUrl: '',
      sessionId: zeroSessionId,
      finalPriceAed: 0,
      isZeroAed: true,
      autoRenew: false,
    };
  }

  const gatewayKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_GATEWAY_KEY) ||
    '';

  const isTestMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  // Live Gateway Integration (Ziina Business) when API key is provided
  if (gatewayKey && !isTestMode && !gatewayKey.startsWith('mock_')) {
    try {
      const isTestKey =
        gatewayKey.includes('test') ||
        gatewayKey.startsWith('sk_test_') ||
        gatewayKey.startsWith('test_');

      // Amount in fils (100 AED = 10,000 fils). Min 2 AED (200 fils).
      const amountInFils = Math.max(200, Math.round(finalPriceAed * 100));

      const origin = typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://realtorbuddy.ae';

      const response = await fetch('https://api-v2.ziina.com/api/payment_intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayKey}`,
        },
        body: JSON.stringify({
          amount: amountInFils,
          currency_code: 'AED',
          message: `Realtor Buddy ${plan.name} (${userEmail}) - AutoRenew: ${autoRenew}`,
          success_url: `${origin}/?payment_success=true&session_id={PAYMENT_INTENT_ID}`,
          cancel_url: `${origin}/subscribe?canceled=true`,
          test: isTestKey,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          checkoutUrl: data.redirect_url,
          sessionId: data.id,
          finalPriceAed,
          isZeroAed: false,
          autoRenew,
        };
      } else {
        const errData = await response.text();
        console.warn('Ziina Payment Intent error response:', errData);
      }
    } catch (networkErr) {
      console.warn('Ziina API network connection fallback:', networkErr);
    }
  }

  // Deterministic Sandbox / Mock Gateway for dev & testing
  const sanitizedPlan = plan.id;
  const mockTimestamp = Date.now();
  const sessionId = `mock_sess_${sanitizedPlan}_${mockTimestamp}`;
  const checkoutUrl = `https://checkout.ziina.com/session/${sessionId}?amount=${finalPriceAed}&currency=AED&apple_pay=true&email=${encodeURIComponent(
    userEmail
  )}&plan=${sanitizedPlan}&autorenew=${autoRenew}`;

  return {
    checkoutUrl,
    sessionId,
    finalPriceAed,
    isZeroAed: false,
    autoRenew,
  };
}

/**
 * Verifies payment session status with the UAE payment gateway (Ziina).
 * Calls GET /payment_intent/{id} when live gateway key is configured.
 */
export async function verifySessionStatus(sessionId: string): Promise<SubscriptionStatus> {
  if (!sessionId) {
    return 'inactive';
  }

  const gatewayKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_GATEWAY_KEY) ||
    '';

  const isTestMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  // Live status verification with Ziina API
  if (gatewayKey && !isTestMode && !sessionId.startsWith('mock_')) {
    try {
      const response = await fetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gatewayKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const status = data.status; // 'pending' | 'completed' | 'failed' | 'canceled'
        if (status === 'completed') return 'active';
        if (status === 'failed') return 'past_due';
        if (status === 'canceled') return 'canceled';
        if (status === 'pending') return 'inactive';
      }
    } catch (err) {
      console.warn('Failed to verify status with Ziina:', err);
    }
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
