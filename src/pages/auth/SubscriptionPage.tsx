import React, { useState } from 'react';
import {
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
  validateCouponCode,
  validateReferralCode,
  type CouponValidationResult,
  type ReferralValidationResult,
} from '../../services/paymentService';
import { Tag, Users, RefreshCw, CheckCircle, Sparkles, Clock } from 'lucide-react';

interface SubscriptionPageProps {
  userEmail?: string;
  onPaymentInitiated?: (sessionId: string, checkoutUrl: string) => void;
  className?: string;
}

export default function SubscriptionPage({
  userEmail = 'agent@realtorbuddy.ae',
  onPaymentInitiated,
  className = '',
}: SubscriptionPageProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | 'annual'>('monthly');
  const [autoRenew, setAutoRenew] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [appliedReferral, setAppliedReferral] = useState<ReferralValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPlan = SUBSCRIPTION_PLANS[selectedPlanId];

  // Re-calculate discounts when plan changes
  const couponDiscountAed = appliedCoupon?.valid
    ? validateCouponCode(appliedCoupon.code || '', selectedPlan.priceAed).discountAed
    : 0;

  const referralDiscountAed = appliedReferral?.valid
    ? validateReferralCode(appliedReferral.code || '', selectedPlan.priceAed).discountAed
    : 0;

  const totalDiscountAed = couponDiscountAed + referralDiscountAed;
  const finalPriceAed = Math.max(0, selectedPlan.priceAed - totalDiscountAed);

  const handleApplyCoupon = (e?: React.FormEvent) => {
    e?.preventDefault();
    setCouponError(null);
    const res = validateCouponCode(couponInput, selectedPlan.priceAed);
    if (res.valid) {
      setAppliedCoupon(res);
      setCouponError(null);
    } else {
      setCouponError(res.errorMessage || 'Invalid coupon code');
      setAppliedCoupon(null);
    }
  };

  const handleApplyReferral = (e?: React.FormEvent) => {
    e?.preventDefault();
    setReferralError(null);
    const res = validateReferralCode(referralInput, selectedPlan.priceAed);
    if (res.valid) {
      setAppliedReferral(res);
      setReferralError(null);
    } else {
      setReferralError(res.errorMessage || 'Invalid referral code');
      setAppliedReferral(null);
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await createCheckoutSession(selectedPlanId, userEmail, {
        autoRenew,
        couponCode: appliedCoupon?.valid ? appliedCoupon.code : undefined,
        referralCode: appliedReferral?.valid ? appliedReferral.code : undefined,
      });

      if (onPaymentInitiated) {
        onPaymentInitiated(session.sessionId, session.checkoutUrl);
      }

      // If zero AED instant activation
      if (session.isZeroAed) {
        return;
      }

      // If in browser environment outside of test runner
      if (
        typeof window !== 'undefined' &&
        import.meta.env?.MODE !== 'test' &&
        session.checkoutUrl
      ) {
        try {
          window.location.href = session.checkoutUrl;
        } catch {
          // Ignore navigation errors
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to initiate payment session. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 ${className}`}>
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 uppercase tracking-widest mb-3">
          Dubai Realtor License Required
        </span>
        <h1 className="font-serif text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl lg:text-5xl">
          Subscribe to Realtor Buddy
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-slate-600 sm:text-lg">
          Gain wholesale developer inventory, direct commission agreements, and AI-powered client
          shortlists across Dubai.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {errorMessage}
        </div>
      )}

      {/* Plan Selection Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Monthly Plan */}
        <div
          onClick={() => setSelectedPlanId('monthly')}
          className={`cursor-pointer rounded-2xl border-2 p-6 transition-all relative ${
            selectedPlanId === 'monthly'
              ? 'border-slate-950 bg-stone-50/70 shadow-lg ring-2 ring-amber-500/20'
              : 'border-stone-200 hover:border-stone-300 bg-white'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {SUBSCRIPTION_PLANS.monthly.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Flexible monthly membership</p>
            </div>
            <input
              type="radio"
              name="plan"
              checked={selectedPlanId === 'monthly'}
              onChange={() => setSelectedPlanId('monthly')}
              aria-label="Monthly plan"
              className="h-5 w-5 text-slate-900 focus:ring-amber-500 border-stone-300 cursor-pointer"
            />
          </div>

          <div className="mb-4">
            <span className="font-serif text-3xl font-bold text-slate-900 tabular-nums">499</span>
            <span className="text-slate-500 font-medium ml-1.5">AED / month</span>
          </div>

          <ul className="space-y-2.5 text-sm text-slate-600 border-t border-stone-100 pt-4">
            {SUBSCRIPTION_PLANS.monthly.features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Annual Plan */}
        <div
          onClick={() => setSelectedPlanId('annual')}
          className={`cursor-pointer rounded-2xl border-2 p-6 transition-all relative ${
            selectedPlanId === 'annual'
              ? 'border-slate-950 bg-stone-50/70 shadow-lg ring-2 ring-amber-500/20'
              : 'border-stone-200 hover:border-stone-300 bg-white'
          }`}
        >
          {SUBSCRIPTION_PLANS.annual.savingsBadge && (
            <span className="absolute -top-3 right-6 bg-slate-950 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 rounded-full shadow-md">
              {SUBSCRIPTION_PLANS.annual.savingsBadge}
            </span>
          )}

          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900">
                {SUBSCRIPTION_PLANS.annual.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Top-producing agencies & elite brokers</p>
            </div>
            <input
              type="radio"
              name="plan"
              checked={selectedPlanId === 'annual'}
              onChange={() => setSelectedPlanId('annual')}
              aria-label="Annual plan"
              className="h-5 w-5 text-slate-900 focus:ring-amber-500 border-stone-300 cursor-pointer"
            />
          </div>

          <div className="mb-4">
            <span className="font-serif text-3xl font-bold text-slate-900 tabular-nums">4,990</span>
            <span className="text-slate-500 font-medium ml-1.5">AED / year</span>
            <p className="text-xs text-amber-800 font-semibold mt-1">
              Equivalent to ~415 AED/mo (Save 998 AED)
            </p>
          </div>

          <ul className="space-y-2.5 text-sm text-slate-600 border-t border-stone-100 pt-4">
            {SUBSCRIPTION_PLANS.annual.features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Autopay, Referral, and Coupon Codes Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Subscription Preferences & Partner Vouchers</span>
        </h3>

        {/* Autopay Toggle */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            aria-label="Enable Auto-Renew (Autopay)"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Enable Auto-Renew (Autopay)</span>
            </span>
            <p className="text-slate-500 mt-0.5">
              Automatically renews your subscription at the end of each billing cycle without interruption. You can cancel anytime.
            </p>
          </div>
        </label>

        {/* Coupon Code Input & Referral Code Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Coupon Code */}
          <div className="space-y-1.5">
            <label htmlFor="coupon-code-input" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>Coupon Code</span>
            </label>
            <div className="flex gap-2">
              <input
                id="coupon-code-input"
                type="text"
                placeholder="e.g. SPECIAL20 or VIP100"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 h-9 px-3 text-xs uppercase font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon()}
                className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>}
            {appliedCoupon?.valid && (
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>{appliedCoupon.description} applied (-{couponDiscountAed} AED)</span>
              </p>
            )}
          </div>

          {/* Referral Code */}
          <div className="space-y-1.5">
            <label htmlFor="referral-code-input" className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Broker Referral Code</span>
            </label>
            <div className="flex gap-2">
              <input
                id="referral-code-input"
                type="text"
                placeholder="e.g. DUBAI-BROKER or EMAAR-PARTNER"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value)}
                className="flex-1 h-9 px-3 text-xs uppercase font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
              />
              <button
                type="button"
                onClick={() => handleApplyReferral()}
                className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-2xs"
              >
                Apply
              </button>
            </div>
            {referralError && <p className="text-[11px] text-rose-600 font-medium">{referralError}</p>}
            {appliedReferral?.valid && (
              <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>10% referral discount applied (-{referralDiscountAed} AED)</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Box */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                Selected Plan
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-300">{selectedPlan.name}</span>
            </div>

            {/* Price breakdown */}
            <div className="flex items-baseline gap-2">
              <div className="text-2xl sm:text-3xl font-bold">
                {finalPriceAed.toLocaleString()} AED
                <span className="text-sm font-normal text-slate-400 ml-1">
                  /{selectedPlan.interval === 'month' ? 'month' : 'year'}
                </span>
              </div>
              {totalDiscountAed > 0 && (
                <div className="text-sm text-slate-400 line-through">
                  {selectedPlan.priceAed.toLocaleString()} AED
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span className="inline-flex items-center gap-1.5">
                {autoRenew ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-Renew enabled</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Single billing cycle</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span>Instant activation • UAE tax invoice</span>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-3">
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 border border-transparent rounded-xl text-base font-bold text-slate-900 bg-white hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 shadow-md transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <svg
                    className="animate-spin h-5 w-5 text-slate-900"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Processing...</span>
                </span>
              ) : finalPriceAed === 0 ? (
                'Activate Instant Free Access (VIP)'
              ) : (
                `Pay with Apple Pay / Card (${finalPriceAed.toLocaleString()} AED)`
              )}
            </button>

            {/* Badges */}
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="text-base"></span>
                <span>Apple Pay</span>
              </span>
              <span>•</span>
              <span>Visa / Mastercard</span>
              <span>•</span>
              <span>AED Gateway</span>
            </div>
          </div>
        </div>
      </div>

      {/* Support / Concierge footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <p>
          Realtor Buddy is strictly for licensed UAE real estate professionals.
        </p>
        <p className="mt-1">
          Questions or custom agency team billing? Contact Monil & Edwin via WhatsApp concierge at{' '}
          <span className="font-semibold text-slate-700">+971 50 123 4567</span>.
        </p>
      </div>
    </div>
  );
}
