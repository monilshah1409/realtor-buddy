import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Ticket,
  Plus,
  Copy,
  Check,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Search,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import type { PromoCoupon } from '../../types';
import {
  fetchAdminPromos,
  createAdminPromo,
  toggleAdminPromo,
} from '../../services/marketingService';

export interface AdminPromosProps {
  initialPromos?: PromoCoupon[];
  onCreatePromo?: (
    promo: Omit<PromoCoupon, 'id' | 'times_redeemed' | 'created_at'>
  ) => Promise<PromoCoupon>;
  onTogglePromo?: (promoId: string, isActive: boolean) => Promise<boolean>;
}

type PromoFilter = 'all' | 'active' | 'inactive' | 'expired';

export const AdminPromos: React.FC<AdminPromosProps> = ({
  initialPromos,
  onCreatePromo,
  onTogglePromo,
}) => {
  const [promos, setPromos] = useState<PromoCoupon[]>(initialPromos || []);
  const [loading, setLoading] = useState<boolean>(!initialPromos);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filter, setFilter] = useState<PromoFilter>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState<string>('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed_aed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formMaxUses, setFormMaxUses] = useState<string>('100');
  const [formValidUntil, setFormValidUntil] = useState<string>('');

  // Sync initialPromos prop if updated
  useEffect(() => {
    if (initialPromos) {
      setPromos(initialPromos);
    }
  }, [initialPromos]);

  // Load promos on mount if not provided via props
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await fetchAdminPromos();
        if (isMounted) {
          setPromos(data);
        }
      } catch (err) {
        console.error('Failed to load admin promos:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (!initialPromos) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [initialPromos]);

  // Auto-dismiss feedback message
  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const isExpired = (validUntil?: string | null): boolean => {
    if (!validUntil) return false;
    return new Date(validUntil).getTime() < Date.now();
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-AE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const handleCopy = async (code: string) => {
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        // Fallback handled silently
      }
    }
    setCopiedCode(code);
    setFeedbackMessage(`Promo code ${code} copied to clipboard`);
    setTimeout(() => {
      setCopiedCode((curr) => (curr === code ? null : curr));
    }, 2000);
  };

  const handleToggle = async (promo: PromoCoupon) => {
    const newStatus = !promo.is_active;

    // Optimistic UI update
    setPromos((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, is_active: newStatus } : p))
    );

    try {
      if (onTogglePromo) {
        await onTogglePromo(promo.id, newStatus);
      } else {
        await toggleAdminPromo(promo.id, newStatus);
      }
      setFeedbackMessage(
        `Coupon ${promo.code} ${newStatus ? 'activated' : 'deactivated'}`
      );
    } catch (err) {
      console.error('Failed to toggle promo status:', err);
      // Revert optimistic update
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: promo.is_active } : p))
      );
      setFeedbackMessage(`Failed to update coupon status for ${promo.code}`);
    }
  };

  const openModal = () => {
    setFormCode('');
    setFormDiscountType('percentage');
    setFormDiscountValue('');
    setFormDescription('');
    setFormMaxUses('100');
    setFormValidUntil('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedCode = formCode.trim().toUpperCase();

    if (!sanitizedCode) {
      setModalError('Coupon code is required.');
      return;
    }

    const numValue = Number(formDiscountValue);
    if (!formDiscountValue || isNaN(numValue) || numValue <= 0) {
      setModalError('Discount value must be greater than 0.');
      return;
    }

    if (formDiscountType === 'percentage' && numValue > 100) {
      setModalError('Percentage discount cannot exceed 100%.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload = {
      code: sanitizedCode,
      discount_type: formDiscountType,
      discount_value: numValue,
      description: formDescription.trim(),
      max_uses: formMaxUses ? Number(formMaxUses) : 100,
      valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
      is_active: true,
    };

    try {
      let created: PromoCoupon;
      if (onCreatePromo) {
        created = await onCreatePromo(payload);
      } else {
        created = await createAdminPromo(payload);
      }

      setPromos((prev) => [created, ...prev]);
      setFeedbackMessage(`Created promotional code ${sanitizedCode} successfully`);
      closeModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create promo code';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredPromos = useMemo(() => {
    return promos.filter((promo) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatch = promo.code.toLowerCase().includes(query);
        const descMatch = promo.description?.toLowerCase().includes(query);
        if (!codeMatch && !descMatch) return false;
      }

      // 2. Filter Status
      if (filter === 'active') {
        return promo.is_active && !isExpired(promo.valid_until);
      }
      if (filter === 'inactive') {
        return !promo.is_active;
      }
      if (filter === 'expired') {
        return isExpired(promo.valid_until);
      }

      return true;
    });
  }, [promos, searchQuery, filter]);

  // Aggregate Metrics
  const totalRedemptions = useMemo(
    () => promos.reduce((sum, p) => sum + (p.times_redeemed || 0), 0),
    [promos]
  );
  const activePromosCount = useMemo(
    () => promos.filter((p) => p.is_active && !isExpired(p.valid_until)).length,
    [promos]
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans">
      {/* Top Header - Luxury Dubai Palette */}
      <header className="bg-[#090D15] text-white border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-900 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30 shadow-xs">
              <Ticket className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-serif font-bold tracking-tight text-white">
                  Promo & Voucher Management
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  {promos.length} Coupons
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">
                Monil & Edwin Platform Gatekeeper • Dubai Prime Properties
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openModal}
              className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Create Promo Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Toast Feedback */}
        {feedbackMessage && (
          <div className="bg-slate-900 text-[#FAF8F5] border border-[#D4AF37]/40 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <span className="text-xs font-medium">{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-stone-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metrics Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Active Vouchers
              </span>
              <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                <Tag className="w-4 h-4 text-[#D4AF37]" />
              </div>
            </div>
            <div className="text-2xl font-serif font-bold text-slate-900">
              {activePromosCount}
            </div>
            <p className="text-xs text-stone-500 mt-1">Ready for broker checkout</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Total Redemptions
              </span>
              <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              </div>
            </div>
            <div className="text-2xl font-serif font-bold text-slate-900">
              {totalRedemptions}
            </div>
            <p className="text-xs text-stone-500 mt-1">Claimed by Dubai brokers</p>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Partner Discounts
              </span>
              <div className="p-2 rounded-xl bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/20">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              </div>
            </div>
            <div className="text-2xl font-serif font-bold text-slate-900">
              {promos.length}
            </div>
            <p className="text-xs text-stone-500 mt-1">Total lifetime coupons</p>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search promo code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 placeholder-stone-400 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'all', label: 'All Codes' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
                { id: 'expired', label: 'Expired' },
              ] as const
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-[#D4AF37] font-semibold border border-[#D4AF37]/30 shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Promo Coupons Table */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-stone-400 text-xs font-medium">
              Loading promo codes...
            </div>
          ) : filteredPromos.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">No promo codes found</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery || filter !== 'all'
                  ? 'Try adjusting your search query or filter selection.'
                  : 'Get started by creating your first promotional code for broker checkout.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    <th className="py-3.5 px-4 sm:px-6">Voucher Code</th>
                    <th className="py-3.5 px-4">Discount</th>
                    <th className="py-3.5 px-4">Redemptions / Cap</th>
                    <th className="py-3.5 px-4">Valid Until</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs text-slate-800">
                  {filteredPromos.map((promo) => {
                    const expired = isExpired(promo.valid_until);
                    const percentUsed =
                      promo.max_uses > 0
                        ? Math.min(100, Math.round((promo.times_redeemed / promo.max_uses) * 100))
                        : 0;

                    return (
                      <tr
                        key={promo.id}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        {/* Code Column */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold tracking-wider text-xs px-2.5 py-1 rounded-lg bg-slate-950 text-[#D4AF37] border border-[#D4AF37]/30 shadow-xs">
                              {promo.code}
                            </span>
                            <button
                              onClick={() => handleCopy(promo.code)}
                              aria-label="copy code"
                              title="Copy code"
                              className="p-1 rounded-md text-stone-400 hover:text-slate-900 hover:bg-stone-100 transition-colors cursor-pointer"
                            >
                              {copiedCode === promo.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {promo.description && (
                            <p className="text-[11px] text-stone-500 mt-1 max-w-xs truncate">
                              {promo.description}
                            </p>
                          )}
                        </td>

                        {/* Discount Column */}
                        <td className="py-4 px-4">
                          {promo.discount_type === 'percentage' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              <span>{promo.discount_value}% OFF</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                              <span>{promo.discount_value} AED OFF</span>
                            </span>
                          )}
                        </td>

                        {/* Redemptions Progress Column */}
                        <td className="py-4 px-4 min-w-[160px]">
                          <div className="flex items-baseline justify-between gap-2 mb-1.5 text-xs font-semibold text-slate-800">
                            <span>
                              {promo.times_redeemed} / {promo.max_uses}
                            </span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              {percentUsed}%
                            </span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentUsed >= 90
                                  ? 'bg-rose-500'
                                  : percentUsed >= 50
                                  ? 'bg-[#D4AF37]'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </td>

                        {/* Valid Until Column */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-stone-600">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{formatDate(promo.valid_until)}</span>
                          </div>
                          {expired && (
                            <span
                              data-testid={`expired-badge-${promo.id}`}
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            >
                              Expired
                            </span>
                          )}
                        </td>

                        {/* Status Toggle Column */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            data-testid={`toggle-${promo.id}`}
                            aria-checked={promo.is_active}
                            onClick={() => handleToggle(promo)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              promo.is_active
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                promo.is_active ? 'bg-emerald-600' : 'bg-stone-400'
                              }`}
                            />
                            <span>{promo.is_active ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Promo Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#090D15] text-white px-6 py-4 flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-[#D4AF37] border border-[#D4AF37]/30">
                  <Ticket className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 id="modal-title" className="text-base font-serif font-bold text-white">
                  Create Promotional Code
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="close modal"
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} noValidate className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Code Input */}
              <div>
                <label
                  htmlFor="promo-code"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="promo-code"
                  type="text"
                  required
                  placeholder="e.g. VIP25"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="w-full px-3.5 py-2.5 font-mono uppercase bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Uppercase alphanumeric code for checkout redemption.
                </p>
              </div>

              {/* Discount Type Toggle */}
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Discount Type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormDiscountType('percentage')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formDiscountType === 'percentage'
                        ? 'bg-slate-900 text-[#D4AF37] border-[#D4AF37]/50 shadow-xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDiscountType('fixed_aed')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formDiscountType === 'fixed_aed'
                        ? 'bg-slate-900 text-[#D4AF37] border-[#D4AF37]/50 shadow-xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Fixed AED (AED)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label
                  htmlFor="discount-value"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Discount Value ({formDiscountType === 'percentage' ? '%' : 'AED'}){' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  id="discount-value"
                  type="number"
                  min="1"
                  max={formDiscountType === 'percentage' ? '100' : '9999'}
                  required
                  placeholder={formDiscountType === 'percentage' ? '20' : '50'}
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="promo-description"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Description (Optional)
                </label>
                <input
                  id="promo-description"
                  type="text"
                  placeholder="e.g. VIP Partner 20% discount"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                />
              </div>

              {/* Grid: Max Uses & Expiration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="max-uses"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Max Redemptions Cap
                  </label>
                  <input
                    id="max-uses"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="expiration-date"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Expiration Date
                  </label>
                  <input
                    id="expiration-date"
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stone-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Generating...' : 'Generate Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromos;
