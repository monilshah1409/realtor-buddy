import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Profile } from '../../types';
import SubscriptionPage from '../../pages/auth/SubscriptionPage';

export interface PaywallGateProps {
  profile?: Partial<Profile> | null;
  user?: { email?: string; [key: string]: any } | null;
  children: React.ReactNode;
}

export default function PaywallGate({
  profile,
  user,
  children,
}: PaywallGateProps) {
  // 1. Admin access override: Always allowed access
  if (profile?.role === 'admin') {
    return <>{children}</>;
  }

  // 2. Subscription verification: Must have active subscription
  if (!profile || profile.subscription_status !== 'active') {
    const userEmail = user?.email || (profile as any)?.email || 'agent@realtorbuddy.ae';
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <SubscriptionPage userEmail={userEmail} />
      </div>
    );
  }

  // 3. Broker Credential Approval Gate:
  // If subscription is paid and active, but admin approval is pending
  if (profile.status === 'pending_approval') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          {/* Dubai Real Estate Badge / Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wide mb-3">
            Subscription Active
          </span>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Broker Verification in Progress
          </h2>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 my-4 text-left text-sm text-emerald-900">
            <p className="font-semibold mb-1">Your subscription is active!</p>
            <p className="text-emerald-800">
              Monil & Edwin are verifying your broker credentials. You will have full access within 2 hours.
            </p>
          </div>

          <p className="text-xs text-slate-500 mb-6">
            To maintain confidential developer wholesale pricing, all agent credentials undergo manual verification.
          </p>

          <div className="border-t border-slate-100 pt-5">
            <a
              href="https://wa.me/971501234567?text=Hello%20Monil%20and%20Edwin,%20I%20subscribed%20to%20Realtor%20Buddy%20and%20need%20verification."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 text-sm font-semibold transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Expedite via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Suspended Account Gate
  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-rose-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-rose-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your broker account has been suspended. Please contact platform administration to resolve this matter.
          </p>
        </div>
      </div>
    );
  }

  // 5. Active & Approved: Allow full access
  return <>{children}</>;
}
