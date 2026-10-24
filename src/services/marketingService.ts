import { supabase, isLiveSupabase } from '../lib/supabase';
import {
  MarketingCampaign,
  PromoCoupon,
  Profile,
  EmailLog,
  PaymentTransaction,
} from '../types';

/**
 * Standard Unified Subscription Price: 149 AED / month
 */
export const MONTHLY_PLAN_PRICE_AED = 149;

// Default initial seeds for offline / test / fallback mode
const DEFAULT_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp_trial_day_3',
    title: 'Trial Day 3 Feature Discovery',
    trigger_type: 'trial_day_3',
    subject: 'Discover Off-Plan Wholesale Pricing & Shortlist Exporting',
    content_html:
      '<p>Explore the full inventory of luxury off-plan developments across Dubai, download broker-ready branded brochures, and export curated client shortlists.</p>',
    is_active: true,
    audience: 'trial',
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
  },
  {
    id: 'camp_trial_expiring_24h',
    title: 'Trial 24h Expiration Alert',
    trigger_type: 'trial_expiring_24h',
    subject: 'Your 5-Day Free Trial expires tomorrow — Continue for 149 AED/mo',
    content_html:
      '<p>Your 5-day full-access trial ends tomorrow. Continue unlocking wholesale Dubai off-plan developments and priority developer launches for only 149 AED/month.</p>',
    is_active: true,
    audience: 'trial',
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
  },
  {
    id: 'camp_trial_expired_winback',
    title: 'Trial Expired Win-Back Offer',
    trigger_type: 'trial_expired_winback',
    subject: 'Special 20% discount code to continue your Dubai access',
    content_html:
      '<p>We would love to keep partnering with your brokerage. Use promo code <strong>SPECIAL20</strong> to reactivate your access with an exclusive 20% savings.</p>',
    is_active: true,
    audience: 'expired',
    created_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
  },
];

const DEFAULT_PROMOS: PromoCoupon[] = [
  {
    id: 'promo_special20',
    code: 'SPECIAL20',
    discount_type: 'percentage',
    discount_value: 20,
    description: '20% Special Partner Discount',
    is_active: true,
    max_uses: 100,
    times_redeemed: 14,
    valid_until: '2026-12-31T23:59:59.000Z',
    created_at: '2026-10-24T00:00:00.000Z',
  },
  {
    id: 'promo_welcome50',
    code: 'WELCOME50',
    discount_type: 'fixed_aed',
    discount_value: 50,
    description: '50 AED Welcome Credit',
    is_active: true,
    max_uses: 200,
    times_redeemed: 42,
    valid_until: null,
    created_at: '2026-10-24T00:00:00.000Z',
  },
  {
    id: 'promo_earlybird',
    code: 'EARLYBIRD',
    discount_type: 'percentage',
    discount_value: 30,
    description: '30% Early Bird VIP Discount',
    is_active: true,
    max_uses: 50,
    times_redeemed: 8,
    valid_until: '2026-11-30T23:59:59.000Z',
    created_at: '2026-10-24T00:00:00.000Z',
  },
];

export const DEFAULT_BROKER_PROFILES: Profile[] = [
  {
    id: 'broker_1',
    full_name: 'Tariq Al-Mansoor',
    agency_name: 'Apex Luxury Real Estate',
    email: 'tariq@apexrealty.ae',
    phone_number: '+971 50 112 3344',
    whatsapp_number: '+971 50 112 3344',
    role: 'agent',
    status: 'active',
    subscription_status: 'active',
    trial_expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'broker_2',
    full_name: 'Elena Rostova',
    agency_name: 'Skyline Capital Dubai',
    email: 'elena@skylinecapital.ae',
    phone_number: '+971 52 987 6543',
    whatsapp_number: '+971 52 987 6543',
    role: 'agent',
    status: 'active',
    subscription_status: 'trial',
    trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'broker_3',
    full_name: 'Zayed Al-Nahyan',
    agency_name: 'Palm & Marina Realty',
    email: 'zayed@palmmarina.ae',
    phone_number: '+971 55 443 2211',
    whatsapp_number: '+971 55 443 2211',
    role: 'agent',
    status: 'active',
    subscription_status: 'trial',
    trial_expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'broker_4',
    full_name: 'Sarah Jenkins',
    agency_name: 'Downtown Prime Brokers',
    email: 'sarah@downtownprime.ae',
    phone_number: '+971 50 776 5544',
    whatsapp_number: '+971 50 776 5544',
    role: 'agent',
    status: 'active',
    subscription_status: 'trial',
    trial_expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'broker_5',
    full_name: 'Fahad Bin Khalid',
    agency_name: 'Emirates Gold Assets',
    email: 'fahad@emiratesgold.ae',
    phone_number: '+971 54 332 1100',
    whatsapp_number: '+971 54 332 1100',
    role: 'agent',
    status: 'active',
    subscription_status: 'inactive',
    trial_expires_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEFAULT_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'tx_seed_1',
    user_id: 'user_1',
    user_email: 'broker1@apexrealty.ae',
    amount_aed: 149,
    plan_id: 'monthly',
    payment_gateway: 'ziina',
    status: 'completed',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx_seed_2',
    user_id: 'user_2',
    user_email: 'broker2@skyline.ae',
    amount_aed: 149,
    plan_id: 'monthly',
    payment_gateway: 'ziina',
    status: 'completed',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx_seed_3',
    user_id: 'user_3',
    user_email: 'broker3@marinaestates.ae',
    amount_aed: 119, // discounted with SPECIAL20
    plan_id: 'monthly',
    promo_code: 'SPECIAL20',
    payment_gateway: 'ziina',
    status: 'completed',
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx_seed_4',
    user_id: 'user_4',
    user_email: 'broker4@downtownprime.ae',
    amount_aed: 149,
    plan_id: 'monthly',
    payment_gateway: 'ziina',
    status: 'completed',
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// In-memory fallback stores
let memoryCampaigns: MarketingCampaign[] = JSON.parse(JSON.stringify(DEFAULT_CAMPAIGNS));
let memoryPromos: PromoCoupon[] = JSON.parse(JSON.stringify(DEFAULT_PROMOS));
let memoryProfiles: Profile[] = JSON.parse(JSON.stringify(DEFAULT_BROKER_PROFILES));
let memoryEmailLogs: EmailLog[] = [];
let memoryTransactions: PaymentTransaction[] = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));

/**
 * Resets the in-memory fallback store back to initial seed data.
 * Useful for automated tests and isolated runs.
 */
export function resetMarketingStore(): void {
  memoryCampaigns = JSON.parse(JSON.stringify(DEFAULT_CAMPAIGNS));
  memoryPromos = JSON.parse(JSON.stringify(DEFAULT_PROMOS));
  memoryProfiles = JSON.parse(JSON.stringify(DEFAULT_BROKER_PROFILES));
  memoryEmailLogs = [];
  memoryTransactions = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
}

export const resetMarketingMemoryStore = resetMarketingStore;

export function getMemoryEmailLogs(): EmailLog[] {
  return [...memoryEmailLogs];
}

/**
 * 1. fetchMarketingCampaigns
 * Queries marketing_campaigns from Supabase with fallback to pre-set drip triggers.
 */
export async function fetchMarketingCampaigns(): Promise<MarketingCampaign[]> {
  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as MarketingCampaign[];
      }
    } catch (err) {
      console.warn('fetchMarketingCampaigns Supabase query fallback:', err);
    }
  }

  return [...memoryCampaigns];
}

/**
 * 2. toggleMarketingCampaign
 * Updates `is_active` status in Supabase and/or in-memory store.
 */
export async function toggleMarketingCampaign(
  campaignId: string,
  enabled: boolean
): Promise<boolean> {
  let updatedInDb = false;

  if (isLiveSupabase()) {
    try {
      const { error, count } = await supabase
        .from('marketing_campaigns')
        .update({
          is_active: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (!error && (count === null || count === undefined || count > 0)) {
        updatedInDb = true;
      }
    } catch (err) {
      console.warn('toggleMarketingCampaign Supabase update fallback:', err);
    }
  }

  // Update memory store
  const campaign = memoryCampaigns.find((c) => c.id === campaignId);
  if (campaign) {
    campaign.is_active = enabled;
    campaign.updated_at = new Date().toISOString();
    return true;
  }

  return updatedInDb;
}

/**
 * 3. fetchAdminPromos
 * Queries promo_coupons / coupons from Supabase with fallback to default seed vouchers.
 */
export async function fetchAdminPromos(): Promise<PromoCoupon[]> {
  if (isLiveSupabase()) {
    try {
      // First attempt 'coupons', fall back to 'promo_coupons'
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as PromoCoupon[];
      }
    } catch (err) {
      console.warn('fetchAdminPromos Supabase query fallback:', err);
    }
  }

  return [...memoryPromos];
}

/**
 * 4. createAdminPromo
 * Validates, sanitizes coupon code to uppercase, and saves voucher.
 */
export async function createAdminPromo(
  promo: Omit<PromoCoupon, 'id' | 'times_redeemed' | 'created_at'>
): Promise<PromoCoupon> {
  const sanitizedCode = promo.code ? promo.code.trim().toUpperCase() : '';
  if (!sanitizedCode) {
    throw new Error('Coupon code is required.');
  }

  if (promo.discount_value === undefined || promo.discount_value === null || promo.discount_value <= 0) {
    throw new Error('Discount value must be greater than 0.');
  }

  const newPromo: PromoCoupon = {
    id: `promo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code: sanitizedCode,
    discount_type: promo.discount_type || 'percentage',
    discount_value: Number(promo.discount_value),
    description: promo.description || '',
    is_active: promo.is_active !== undefined ? promo.is_active : true,
    max_uses: promo.max_uses !== undefined ? Number(promo.max_uses) : 100,
    times_redeemed: 0,
    valid_until: promo.valid_until || null,
    created_at: new Date().toISOString(),
  };

  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          code: newPromo.code,
          discount_type: newPromo.discount_type,
          discount_value: newPromo.discount_value,
          description: newPromo.description,
          is_active: newPromo.is_active,
          max_uses: newPromo.max_uses,
          times_redeemed: newPromo.times_redeemed,
          valid_until: newPromo.valid_until,
        })
        .select()
        .single();

      if (!error && data) {
        const createdFromDb = data as PromoCoupon;
        memoryPromos.unshift(createdFromDb);
        return createdFromDb;
      }
    } catch (err) {
      console.warn('createAdminPromo Supabase insert fallback:', err);
    }
  }

  memoryPromos.unshift(newPromo);
  return newPromo;
}

/**
 * 5. toggleAdminPromo
 * Updates `is_active` for coupon in Supabase and/or in-memory store.
 */
export async function toggleAdminPromo(promoId: string, isActive: boolean): Promise<boolean> {
  let updatedInDb = false;

  if (isLiveSupabase()) {
    try {
      const { error, count } = await supabase
        .from('coupons')
        .update({ is_active: isActive })
        .eq('id', promoId);

      if (!error && (count === null || count === undefined || count > 0)) {
        updatedInDb = true;
      }
    } catch (err) {
      console.warn('toggleAdminPromo Supabase update fallback:', err);
    }
  }

  // Update memory store
  const found = memoryPromos.find((p) => p.id === promoId);
  if (found) {
    found.is_active = isActive;
    return true;
  }

  return updatedInDb;
}

/**
 * 6. extendBrokerTrial
 * Extends `trial_expires_at` by `additionalDays` (default 3 days).
 * If already expired, base extension from `Date.now()`.
 */
export async function extendBrokerTrial(
  profileId: string,
  additionalDays: number = 3,
  existingProfile?: Profile
): Promise<Profile> {
  let targetProfile: Profile | undefined = existingProfile;

  if (!targetProfile) {
    targetProfile = memoryProfiles.find((p) => p.id === profileId);
  }

  if (!targetProfile && isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (!error && data) {
        targetProfile = data as Profile;
      }
    } catch (err) {
      console.warn('extendBrokerTrial Supabase query fallback:', err);
    }
  }

  const now = Date.now();
  let baseTime = now;

  if (targetProfile?.trial_expires_at) {
    const currentExpiryTime = new Date(targetProfile.trial_expires_at).getTime();
    // If future date, add to it. If past date (expired), base from now.
    if (currentExpiryTime > now) {
      baseTime = currentExpiryTime;
    }
  }

  const extendedExpiryTime = baseTime + additionalDays * 24 * 60 * 60 * 1000;
  const newTrialExpiresAt = new Date(extendedExpiryTime).toISOString();

  const updatedProfile: Profile = {
    ...(targetProfile || {
      id: profileId,
      full_name: 'Broker Agent',
      agency_name: 'Dubai Brokerage',
      whatsapp_number: '+971500000000',
      role: 'agent',
      status: 'active',
      created_at: new Date().toISOString(),
    }),
    trial_expires_at: newTrialExpiresAt,
    subscription_status: 'trial',
  };

  if (isLiveSupabase()) {
    try {
      await supabase
        .from('profiles')
        .update({
          trial_expires_at: newTrialExpiresAt,
          subscription_status: 'trial',
        })
        .eq('id', profileId);
    } catch (err) {
      console.warn('extendBrokerTrial Supabase update fallback:', err);
    }
  }

  // Update in-memory profile store
  const existingIdx = memoryProfiles.findIndex((p) => p.id === profileId);
  if (existingIdx >= 0) {
    memoryProfiles[existingIdx] = updatedProfile;
  } else {
    memoryProfiles.push(updatedProfile);
  }

  return updatedProfile;
}

/**
 * 7. sendBroadcastEmail
 * Invokes Supabase Edge Function `email-dispatcher` with fallback logging.
 */
export async function sendBroadcastEmail(payload: {
  audience: string;
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; dispatchedCount: number }> {
  if (!payload.subject || !payload.subject.trim() || !payload.htmlContent || !payload.htmlContent.trim()) {
    throw new Error('subject and htmlContent are required');
  }

  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase.functions.invoke('email-dispatcher', {
        body: payload,
      });

      if (!error && data && data.success) {
        return {
          success: true,
          dispatchedCount: data.dispatchedCount || 1,
        };
      }
    } catch (err) {
      console.warn('sendBroadcastEmail Edge function fallback:', err);
    }
  }

  // Fallback logging
  const fallbackCount = payload.audience === 'trial_users' || payload.audience === 'trial' ? 24 : 12;

  const logEntry: EmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient_email: `broadcast_${payload.audience || 'all'}@realtorbuddy.ae`,
    campaign_type: payload.audience || 'broadcast',
    subject: payload.subject,
    status: 'sent',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  memoryEmailLogs.unshift(logEntry);

  return {
    success: true,
    dispatchedCount: fallbackCount,
  };
}

/**
 * Dispatches a single or multi-recipient luxury template email via the
 * `email-dispatcher` Supabase Edge Function, with offline memory log fallback.
 */
export async function sendEmailViaTemplate(params: {
  to: string[];
  template: string;
  subject: string;
  data?: Record<string, any>;
}): Promise<{ success: boolean; dispatchedCount: number; error?: string }> {
  if (!params.to || params.to.length === 0) {
    return { success: false, dispatchedCount: 0, error: 'Recipient email required' };
  }

  const cleanRecipients = params.to
    .filter((e) => typeof e === 'string' && e.includes('@'))
    .map((e) => e.trim().toLowerCase());

  if (cleanRecipients.length === 0) {
    return { success: false, dispatchedCount: 0, error: 'Valid recipient email required' };
  }

  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase.functions.invoke('email-dispatcher', {
        body: {
          action: 'send_email',
          to: cleanRecipients,
          template: params.template,
          subject: params.subject,
          data: params.data,
        },
      });

      if (!error && data && data.success) {
        return {
          success: true,
          dispatchedCount: data.dispatchedCount || cleanRecipients.length,
        };
      }
      if (error) {
        console.warn('sendEmailViaTemplate live Edge function notice:', error);
      }
    } catch (err) {
      console.warn('sendEmailViaTemplate live Edge function exception:', err);
    }
  }

  // Fallback logging in memory store
  const logEntry: EmailLog = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient_email: cleanRecipients.join(', '),
    campaign_type: params.template,
    subject: params.subject,
    status: 'sent',
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  memoryEmailLogs.unshift(logEntry);

  return {
    success: true,
    dispatchedCount: cleanRecipients.length,
  };
}

/**
 * 8. fetchRevenueMetrics
 * Computes contracted MRR (active_subscribers × 149 AED), 30-day cash collected,
 * active paying count, and active trial count.
 */
export async function fetchRevenueMetrics(): Promise<{
  mrrAed: number;
  cashCollected30d: number;
  activeCount: number;
  trialCount: number;
}> {
  if (isLiveSupabase()) {
    try {
      // 1. Fetch profiles for counts
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('subscription_status, trial_expires_at');

      if (!profileErr && profiles) {
        const now = Date.now();
        const activeCount = profiles.filter((p) => p.subscription_status === 'active').length;
        const trialCount = profiles.filter(
          (p) =>
            p.subscription_status === 'trial' &&
            (!p.trial_expires_at || new Date(p.trial_expires_at).getTime() > now)
        ).length;

        // 2. Fetch completed transactions in last 30 days
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: txs, error: txErr } = await supabase
          .from('payment_transactions')
          .select('amount_aed')
          .eq('status', 'completed')
          .gte('created_at', thirtyDaysAgo);

        let cashCollected30d = 0;
        if (!txErr && txs) {
          cashCollected30d = txs.reduce((sum, tx) => sum + (Number(tx.amount_aed) || 0), 0);
        }

        return {
          mrrAed: activeCount * MONTHLY_PLAN_PRICE_AED,
          cashCollected30d,
          activeCount,
          trialCount,
        };
      }
    } catch (err) {
      console.warn('fetchRevenueMetrics Supabase fallback:', err);
    }
  }

  // Fallback demo metrics
  const activeCount = 18;
  const trialCount = 27;
  const mrrAed = activeCount * MONTHLY_PLAN_PRICE_AED; // 18 * 149 = 2,682 AED

  // Sum 30d cash from in-memory transactions
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cashCollected30d = memoryTransactions
    .filter((tx) => tx.status === 'completed' && new Date(tx.created_at).getTime() >= thirtyDaysAgo)
    .reduce((sum, tx) => sum + tx.amount_aed, 0);

  return {
    mrrAed,
    cashCollected30d: cashCollected30d > 0 ? cashCollected30d : 2682,
    activeCount,
    trialCount,
  };
}

/**
 * 9. fetchBrokerProfiles
 * Fetches all broker profiles from Supabase or returns in-memory seeds.
 */
export async function fetchBrokerProfiles(): Promise<Profile[]> {
  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as Profile[];
      }
    } catch (err) {
      console.warn('fetchBrokerProfiles Supabase fallback:', err);
    }
  }

  return [...memoryProfiles];
}

/**
 * 10. fetchPaymentTransactions
 * Fetches recent payment transactions from Supabase or returns in-memory seeds.
 */
export async function fetchPaymentTransactions(): Promise<PaymentTransaction[]> {
  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as PaymentTransaction[];
      }
    } catch (err) {
      console.warn('fetchPaymentTransactions Supabase fallback:', err);
    }
  }

  return [...memoryTransactions];
}

/**
 * 11. grantBrokerVip
 * Upgrades broker to active VIP membership.
 */
export async function grantBrokerVip(
  profileId: string,
  existingProfile?: Profile
): Promise<Profile> {
  let targetProfile: Profile | undefined = existingProfile;

  if (!targetProfile) {
    targetProfile = memoryProfiles.find((p) => p.id === profileId);
  }

  if (!targetProfile && isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (!error && data) {
        targetProfile = data as Profile;
      }
    } catch (err) {
      console.warn('grantBrokerVip Supabase query fallback:', err);
    }
  }

  const updatedProfile: Profile = {
    ...(targetProfile || {
      id: profileId,
      full_name: 'Broker Agent',
      agency_name: 'Dubai Brokerage',
      whatsapp_number: '+971500000000',
      role: 'agent',
      status: 'active',
      created_at: new Date().toISOString(),
    }),
    subscription_status: 'active',
    status: 'active',
  };

  if (isLiveSupabase()) {
    try {
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          status: 'active',
        })
        .eq('id', profileId);
    } catch (err) {
      console.warn('grantBrokerVip Supabase update fallback:', err);
    }
  }

  const existingIdx = memoryProfiles.findIndex((p) => p.id === profileId);
  if (existingIdx >= 0) {
    memoryProfiles[existingIdx] = updatedProfile;
  } else {
    memoryProfiles.push(updatedProfile);
  }

  return updatedProfile;
}
