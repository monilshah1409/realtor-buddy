import React, { useState } from 'react';
import {
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
} from '../../services/paymentService';

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPlan = SUBSCRIPTION_PLANS[selectedPlanId];

  const handleCheckout = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await createCheckoutSession(selectedPlanId, userEmail);

      if (onPaymentInitiated) {
        onPaymentInitiated(session.sessionId, session.checkoutUrl);
      }

      // If in browser environment outside of test runner
      if (
        typeof window !== 'undefined' &&
        import.meta.env?.MODE !== 'test'
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
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wide mb-3">
          Dubai Realtor License Required
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Subscribe to Realtor Buddy
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-slate-600 sm:text-lg">
          Gain wholesale developer inventory, direct commission agreements, and AI-powered client
          shortlists across Dubai.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
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
              ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-2 ring-emerald-600'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
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
              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
          </div>

          <div className="mb-4">
            <span className="text-3xl font-extrabold text-slate-900">499</span>
            <span className="text-slate-500 font-medium ml-1">AED / month</span>
            <p className="text-xs text-slate-500 mt-1">Billed monthly in AED</p>
          </div>

          <ul className="space-y-2.5 text-sm text-slate-600 border-t border-slate-100 pt-4">
            {SUBSCRIPTION_PLANS.monthly.features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-emerald-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
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
              ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-2 ring-emerald-600'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <span className="absolute -top-3 right-6 bg-amber-500 text-white text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {SUBSCRIPTION_PLANS.annual.savingsBadge}
          </span>

          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {SUBSCRIPTION_PLANS.annual.name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Annual commitment with top benefits</p>
            </div>
            <input
              type="radio"
              name="plan"
              checked={selectedPlanId === 'annual'}
              onChange={() => setSelectedPlanId('annual')}
              aria-label="Annual plan"
              className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
          </div>

          <div className="mb-4">
            <span className="text-3xl font-extrabold text-slate-900">4,990</span>
            <span className="text-slate-500 font-medium ml-1">AED / year</span>
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Equivalent to ~415 AED/mo (Save 998 AED)
            </p>
          </div>

          <ul className="space-y-2.5 text-sm text-slate-600 border-t border-slate-100 pt-4">
            {SUBSCRIPTION_PLANS.annual.features.map((feature, idx) => (
              <li key={idx} className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-emerald-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Checkout Box */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                Selected Plan
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-sm text-slate-300">{selectedPlan.name}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold">
              {selectedPlan.priceAed.toLocaleString()} AED
              <span className="text-sm font-normal text-slate-400 ml-1">
                /{selectedPlan.interval === 'month' ? 'month' : 'year'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Instant activation • Official UAE tax invoice provided
            </p>
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
                  <span>Redirecting to UAE Gateway...</span>
                </span>
              ) : (
                'Pay with Apple Pay / Card'
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
