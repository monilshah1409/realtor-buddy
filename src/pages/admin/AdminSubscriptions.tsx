import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  Search,
  Calendar,
  CreditCard,
  CheckCircle2,
  X,
  ShieldCheck,
  Crown,
  ArrowUpRight,
  Mail,
  Phone,
  Building2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import type { Profile, PaymentTransaction } from '../../types';
import {
  fetchRevenueMetrics,
  fetchBrokerProfiles,
  fetchPaymentTransactions,
  extendBrokerTrial,
  grantBrokerVip,
  MONTHLY_PLAN_PRICE_AED,
} from '../../services/marketingService';

export interface RevenueMetrics {
  mrrAed: number;
  cashCollected30d: number;
  activeCount: number;
  trialCount: number;
}

export interface AdminSubscriptionsProps {
  initialMetrics?: RevenueMetrics;
  initialBrokers?: Profile[];
  initialTransactions?: PaymentTransaction[];
  onExtendTrial?: (brokerId: string, days: number) => Promise<Profile | void>;
  onGrantVip?: (brokerId: string) => Promise<Profile | void>;
}

type FilterStatus = 'all' | 'active' | 'trial' | 'expired';

export const AdminSubscriptions: React.FC<AdminSubscriptionsProps> = ({
  initialMetrics,
  initialBrokers,
  initialTransactions,
  onExtendTrial,
  onGrantVip,
}) => {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(initialMetrics || null);
  const [brokers, setBrokers] = useState<Profile[]>(initialBrokers || []);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(
    initialTransactions || []
  );

  const [loading, setLoading] = useState<boolean>(
    !initialMetrics || !initialBrokers || !initialTransactions
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync props if provided
  useEffect(() => {
    if (initialMetrics) setMetrics(initialMetrics);
  }, [initialMetrics]);

  useEffect(() => {
    if (initialBrokers) setBrokers(initialBrokers);
  }, [initialBrokers]);

  useEffect(() => {
    if (initialTransactions) setTransactions(initialTransactions);
  }, [initialTransactions]);

  // Load data on mount if not provided via props
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [loadedMetrics, loadedBrokers, loadedTransactions] = await Promise.all([
          initialMetrics ? Promise.resolve(initialMetrics) : fetchRevenueMetrics(),
          initialBrokers ? Promise.resolve(initialBrokers) : fetchBrokerProfiles(),
          initialTransactions ? Promise.resolve(initialTransactions) : fetchPaymentTransactions(),
        ]);

        if (isMounted) {
          if (!initialMetrics) setMetrics(loadedMetrics);
          if (!initialBrokers) setBrokers(loadedBrokers);
          if (!initialTransactions) setTransactions(loadedTransactions);
        }
      } catch (err) {
        console.error('Failed to load subscription dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [initialMetrics, initialBrokers, initialTransactions]);

  // Auto-dismiss feedback message after 5 seconds
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => {
      setFeedbackMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const getTrialDaysRemaining = (profile: Profile): number => {
    if (!profile.trial_expires_at) return 0;
    const diffMs = new Date(profile.trial_expires_at).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  };

  const getBrokerStatusCategory = (profile: Profile): 'active' | 'trial' | 'expired' => {
    if (profile.subscription_status === 'active') {
      return 'active';
    }
    const days = getTrialDaysRemaining(profile);
    if (profile.subscription_status === 'trial' && days > 0) {
      return 'trial';
    }
    return 'expired';
  };

  const filteredBrokers = useMemo(() => {
    return brokers.filter((broker) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        const category = getBrokerStatusCategory(broker);
        if (category !== statusFilter) {
          return false;
        }
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = broker.full_name?.toLowerCase().includes(query);
        const agencyMatch = broker.agency_name?.toLowerCase().includes(query);
        const emailMatch = broker.email?.toLowerCase().includes(query);
        if (!nameMatch && !agencyMatch && !emailMatch) {
          return false;
        }
      }

      return true;
    });
  }, [brokers, statusFilter, searchQuery]);

  const handleExtendTrial = async (brokerId: string, days: number) => {
    const targetBroker = brokers.find((b) => b.id === brokerId);
    if (!targetBroker) return;

    setActionLoadingId(`${brokerId}-${days}`);
    try {
      let updated: Profile | undefined;
      if (onExtendTrial) {
        const res = await onExtendTrial(brokerId, days);
        if (res) updated = res;
      } else {
        updated = await extendBrokerTrial(brokerId, days, targetBroker);
      }

      if (updated) {
        setBrokers((prev) => prev.map((b) => (b.id === brokerId ? updated! : b)));
      } else {
        // Optimistic state calculation
        const now = Date.now();
        let baseTime = now;
        if (targetBroker.trial_expires_at) {
          const currentExp = new Date(targetBroker.trial_expires_at).getTime();
          if (currentExp > now) baseTime = currentExp;
        }
        const newExpiry = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
        setBrokers((prev) =>
          prev.map((b) =>
            b.id === brokerId
              ? { ...b, trial_expires_at: newExpiry, subscription_status: 'trial' }
              : b
          )
        );
      }

      setFeedbackMessage(`Extended trial for ${targetBroker.full_name} by +${days} days`);
    } catch (err) {
      console.error(err);
      setFeedbackMessage(`Failed to extend trial for ${targetBroker.full_name}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleGrantVip = async (brokerId: string) => {
    const targetBroker = brokers.find((b) => b.id === brokerId);
    if (!targetBroker) return;

    setActionLoadingId(`${brokerId}-vip`);
    try {
      let updated: Profile | undefined;
      if (onGrantVip) {
        const res = await onGrantVip(brokerId);
        if (res) updated = res;
      } else {
        updated = await grantBrokerVip(brokerId, targetBroker);
      }

      if (updated) {
        setBrokers((prev) => prev.map((b) => (b.id === brokerId ? updated! : b)));
      } else {
        setBrokers((prev) =>
          prev.map((b) =>
            b.id === brokerId
              ? { ...b, subscription_status: 'active', status: 'active' }
              : b
          )
        );
      }

      setFeedbackMessage(`VIP status granted to ${targetBroker.full_name}`);
    } catch (err) {
      console.error(err);
      setFeedbackMessage(`Failed to grant VIP to ${targetBroker.full_name}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatAED = (amount: number): string => {
    return new Intl.NumberFormat('en-AE').format(amount);
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-AE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-slate-800">
      {/* Top Banner / Luxury Dubai Header */}
      <header className="bg-[#090D15] border-b border-[#D4AF37]/25 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-900 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30 shadow-inner">
              <Crown className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-serif font-bold tracking-tight text-white">
                  Subscriptions & Revenue
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  {MONTHLY_PLAN_PRICE_AED} AED/mo Unified
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">
                Monil & Edwin Platform Gatekeeper • Dubai Prime Properties
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 text-stone-300 text-xs font-medium border border-stone-800">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Ziina Payment Gateway Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Strip */}
        <section aria-label="Revenue and Subscription Metrics">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Contracted MRR */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Contracted MRR
                </span>
                <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                  <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-serif font-bold text-slate-900">
                  {metrics ? formatAED(metrics.mrrAed) : '—'}
                </span>
                <span className="text-xs font-bold text-slate-500">AED</span>
              </div>
              <p className="text-xs text-stone-500">
                {MONTHLY_PLAN_PRICE_AED} AED × {metrics ? metrics.activeCount : 0} active members
              </p>
            </div>

            {/* Card 2: 30-Day Cash Collected */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  30-Day Cash Collected
                </span>
                <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                  <CreditCard className="w-4 h-4 text-[#D4AF37]" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-serif font-bold text-slate-900">
                  {metrics ? formatAED(metrics.cashCollected30d) : '—'}
                </span>
                <span className="text-xs font-bold text-slate-500">AED</span>
              </div>
              <p className="text-xs text-stone-500">Direct Ziina & Stripe receipts</p>
            </div>

            {/* Card 3: Active Paying Brokers */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Active Paying Brokers
                </span>
                <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-serif font-bold text-slate-900">
                  {metrics ? metrics.activeCount : '—'}
                </span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  Active
                </span>
              </div>
              <p className="text-xs text-stone-500">Full confidential access enabled</p>
            </div>

            {/* Card 4: Trial Pipeline */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-[#D4AF37]/40 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Trial Pipeline
                </span>
                <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-serif font-bold text-slate-900">
                  {metrics ? metrics.trialCount : '—'}
                </span>
                <span className="text-xs font-bold text-[#D4AF37] bg-amber-50 px-1.5 py-0.5 rounded-md">
                  5-Day Trial
                </span>
              </div>
              <p className="text-xs text-stone-500">Brokers evaluating Dubai inventory</p>
            </div>
          </div>
        </section>

        {/* Broker Directory Section */}
        <section className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          {/* Header & Controls */}
          <div className="p-5 border-b border-stone-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Broker Directory & Trial Management
              </h2>
              <p className="text-xs text-stone-500">
                Manage broker subscriptions, view trial countdowns, and grant instant extensions.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search brokers by name, agency, or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center rounded-xl bg-stone-100 p-1 border border-stone-200">
                <button
                  type="button"
                  aria-label="All"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-950 text-[#D4AF37] shadow-xs'
                      : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  aria-label="Active"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === 'active'
                      ? 'bg-slate-950 text-[#D4AF37] shadow-xs'
                      : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  aria-label="In Trial"
                  onClick={() => setStatusFilter('trial')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === 'trial'
                      ? 'bg-slate-950 text-[#D4AF37] shadow-xs'
                      : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  In Trial
                </button>
                <button
                  type="button"
                  aria-label="Expired"
                  onClick={() => setStatusFilter('expired')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === 'expired'
                      ? 'bg-slate-950 text-[#D4AF37] shadow-xs'
                      : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  Expired
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200/80 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Broker & Agency
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Contact
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Expires / Renews
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                {filteredBrokers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-stone-500">
                      No brokers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBrokers.map((broker) => {
                    const statusCategory = getBrokerStatusCategory(broker);
                    const daysRemaining = getTrialDaysRemaining(broker);
                    const isVip = broker.subscription_status === 'active';

                    return (
                      <tr
                        key={broker.id}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        {/* Broker & Agency */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-900 text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D4AF37]/30 shadow-xs">
                              {broker.full_name
                                ? broker.full_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()
                                : 'BR'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{broker.full_name || 'Unnamed Broker'}</span>
                                {isVip && (
                                  <Crown className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                                )}
                              </div>
                              <div className="text-stone-500 text-[11px] flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-stone-400" />
                                <span>{broker.agency_name || 'Independent Broker'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4 space-y-1">
                          {broker.email && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{broker.email}</span>
                            </div>
                          )}
                          {(broker.whatsapp_number || broker.phone_number) && (
                            <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{broker.whatsapp_number || broker.phone_number}</span>
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-4">
                          {statusCategory === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active Member
                            </span>
                          ) : statusCategory === 'trial' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-[#D4AF37]" />
                              Trial: {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Trial Expired
                            </span>
                          )}
                        </td>

                        {/* Expiration / Renewal Date */}
                        <td className="px-5 py-4 text-stone-600">
                          {statusCategory === 'active' ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>Renews: {formatDate(broker.trial_expires_at)}</span>
                            </div>
                          ) : broker.trial_expires_at ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span>Expires: {formatDate(broker.trial_expires_at)}</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* +3 Days Button */}
                            <button
                              type="button"
                              data-testid={`extend-trial-3-${broker.id}`}
                              disabled={actionLoadingId === `${broker.id}-3`}
                              onClick={() => handleExtendTrial(broker.id, 3)}
                              className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-50/70 text-amber-900 hover:bg-amber-100 font-semibold text-xs transition-colors disabled:opacity-50"
                              title="Extend free trial by 3 days"
                            >
                              +3 Days
                            </button>

                            {/* +5 Days Button */}
                            <button
                              type="button"
                              data-testid={`extend-trial-5-${broker.id}`}
                              disabled={actionLoadingId === `${broker.id}-5`}
                              onClick={() => handleExtendTrial(broker.id, 5)}
                              className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-50/70 text-amber-900 hover:bg-amber-100 font-semibold text-xs transition-colors disabled:opacity-50"
                              title="Extend free trial by 5 days"
                            >
                              +5 Days
                            </button>

                            {/* Grant VIP Button */}
                            <button
                              type="button"
                              data-testid={`grant-vip-${broker.id}`}
                              disabled={actionLoadingId === `${broker.id}-vip` || isVip}
                              onClick={() => handleGrantVip(broker.id)}
                              className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors border ${
                                isVip
                                  ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                                  : 'bg-slate-950 text-[#D4AF37] hover:bg-slate-800 border-[#D4AF37]/30 shadow-xs'
                              }`}
                              title={isVip ? 'Already VIP Active Member' : 'Grant VIP Full Access'}
                            >
                              {isVip ? 'VIP' : 'Grant VIP'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Payment Transactions Ledger */}
        <section className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-stone-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Recent Payment Transactions
              </h2>
              <p className="text-xs text-stone-500">
                Real-time transaction settlement ledger processed via Ziina and Stripe gateways.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{transactions.length} Total Settled</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200/80 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Transaction ID
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    User Email
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Amount (AED)
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Plan / Promo
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Gateway
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-slate-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-stone-500">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-slate-900 font-semibold">
                        {tx.id}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {tx.user_email || '—'}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {tx.amount_aed} AED
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="capitalize text-stone-600">
                          {tx.plan_id || 'Monthly'}
                        </span>
                        {tx.promo_code && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                            {tx.promo_code}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 uppercase text-[11px] text-stone-500 font-semibold">
                        {tx.payment_gateway || 'Ziina'}
                      </td>
                      <td className="px-5 py-3.5">
                        {tx.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Completed
                          </span>
                        ) : tx.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {tx.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right text-stone-500">
                        {formatDate(tx.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Floating Action Feedback Notification Toast */}
      {feedbackMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-950 text-white shadow-2xl border border-[#D4AF37]/50"
        >
          <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />
          <span className="text-sm font-medium text-stone-100">{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="ml-2 text-stone-400 hover:text-white transition-colors"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;
