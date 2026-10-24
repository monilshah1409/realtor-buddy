import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  TrendingUp,
  Ticket,
  Send,
  ShieldCheck,
  Crown,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { Property } from '../../types';
import { AdminApprovals } from './AdminApprovals';
import { AdminSubscriptions } from './AdminSubscriptions';
import { AdminPromos } from './AdminPromos';
import { AdminMarketing } from './AdminMarketing';

export type AdminTab = 'approvals' | 'subscriptions' | 'promos' | 'marketing';

export interface AdminDashboardProps {
  initialTab?: AdminTab;
  pendingProperties?: Property[];
  onApproveProperty?: (id: string) => void | Promise<void>;
  onRejectProperty?: (id: string, reason?: string) => void | Promise<void>;
  onTabChange?: (tab: AdminTab) => void;
  className?: string;
}

interface TabItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab,
  pendingProperties,
  onApproveProperty,
  onRejectProperty,
  onTabChange,
  className = '',
}) => {
  // Determine initial tab from prop, URL search param, or default to 'approvals'
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (initialTab) return initialTab;
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (
        tabParam === 'approvals' ||
        tabParam === 'subscriptions' ||
        tabParam === 'promos' ||
        tabParam === 'marketing'
      ) {
        return tabParam as AdminTab;
      }
    }
    return 'approvals';
  });

  // Keep state synchronized if initialTab prop changes externally
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Synchronize on browser history popstate (back/forward navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTab | null;
      if (
        tabParam &&
        ['approvals', 'subscriptions', 'promos', 'marketing'].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Pending queue count for badge
  const pendingCount = useMemo(() => {
    if (!pendingProperties) return 0;
    return pendingProperties.filter((p) => p.status === 'private').length;
  }, [pendingProperties]);

  // Tab switching handler
  const handleSelectTab = (tabId: AdminTab) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);

    if (typeof window !== 'undefined' && window.history) {
      try {
        const currentPath = window.location.pathname || '/admin';
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tabId);
        window.history.pushState({}, '', `${currentPath}?${params.toString()}`);
      } catch {
        // Safe fallback in restricted sandboxes
      }
    }
  };

  const tabs: TabItem[] = [
    {
      id: 'approvals',
      label: 'Property Approvals',
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions & Revenue',
      icon: TrendingUp,
    },
    {
      id: 'promos',
      label: 'Promos & Vouchers',
      icon: Ticket,
    },
    {
      id: 'marketing',
      label: 'Marketing & Email',
      icon: Send,
    },
  ];

  return (
    <div className={`min-h-screen bg-[#FAF8F5] flex flex-col font-sans ${className}`}>
      {/* Executive Obsidian & Gold Top Bar */}
      <header className="bg-[#090D15] text-white border-b border-[#D4AF37]/30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Brand & Title */}
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-slate-900 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30 shadow-inner">
                <Crown className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-white">
                    Executive Admin Console
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                    Dubai HQ
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-medium mt-0.5">
                  Platform Gatekeeper • Unified Real Estate Moderation, Subscriptions & Marketing
                </p>
              </div>
            </div>

            {/* Right: Operational Status Pill */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Platform Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="bg-[#0D121F] border-t border-stone-800/80 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <nav
              role="tablist"
              aria-label="Admin Navigation Tabs"
              className="flex space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar py-2.5"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-[#D4AF37] border border-[#D4AF37]/40 shadow-xs'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-[#D4AF37]' : 'text-stone-400'
                      }`}
                    />
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.badge !== undefined && tab.badge !== null && (
                      <span
                        className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                            : 'bg-stone-800 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Dynamic Tab View Container */}
      <main
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 w-full"
      >
        {activeTab === 'approvals' && (
          <AdminApprovals
            pendingProperties={pendingProperties}
            onApprove={onApproveProperty}
            onReject={onRejectProperty}
          />
        )}
        {activeTab === 'subscriptions' && <AdminSubscriptions />}
        {activeTab === 'promos' && <AdminPromos />}
        {activeTab === 'marketing' && <AdminMarketing />}
      </main>
    </div>
  );
};

export default AdminDashboard;
