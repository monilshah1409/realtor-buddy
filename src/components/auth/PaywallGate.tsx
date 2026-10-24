import React from 'react';
import { MessageSquare, Clock, AlertTriangle, ShieldCheck, Mail } from 'lucide-react';
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
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <SubscriptionPage userEmail={userEmail} />
      </div>
    );
  }

  // 3. Broker Credential Approval Gate:
  // If subscription is paid and active, but admin approval is pending
  if (profile.status === 'pending_approval') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200/90 p-8 text-center relative overflow-hidden">
          {/* Subtle gold decorative glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          {/* Verification Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-600 shadow-xs">
            <Clock className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 uppercase tracking-wider mb-3">
            Subscription Active
          </span>

          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
            Broker Verification in Progress
          </h2>

          <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/70 my-4 text-left text-xs leading-relaxed text-emerald-950">
            <p className="font-bold text-sm mb-1 text-emerald-900">Your subscription is active!</p>
            <p className="text-emerald-800">
              Monil & Edwin are verifying your broker credentials. You will have full access within 2 hours.
            </p>
          </div>

          <p className="text-xs text-stone-500 mb-6 leading-relaxed">
            To maintain confidential developer wholesale pricing, all agent credentials undergo manual verification.
          </p>

          <div className="border-t border-stone-100 pt-5 space-y-2">
            <a
              href="mailto:mswebdevelopments.uae@gmail.com?subject=Broker%20Verification%20Priority%20Inquiry"
              className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl border border-amber-500/40 text-amber-900 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
            >
              <Mail className="w-4 h-4 text-amber-600" />
              <span>Contact Concierge Desk</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Suspended Account Gate
  if (profile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-rose-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">Account Suspended</h2>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Your broker account has been suspended. Please contact platform administration to resolve this matter.
          </p>
          <a
            href="mailto:mswebdevelopments.uae@gmail.com?subject=Suspended%20Account%20Inquiry"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </a>
        </div>
      </div>
    );
  }

  // 5. Active & Approved: Allow full access
  return <>{children}</>;
}
