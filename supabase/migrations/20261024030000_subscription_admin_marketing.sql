-- Realtor Buddy: Unified 149 AED Subscription, 5-Day Free Trial & Admin Marketing Suite
-- Version: 20261024030000
-- Migration: Add email & trial_expires_at to profiles, upgrade coupons with usage caps,
-- create payment_transactions, marketing_campaigns, and email_logs with Admin RLS.

-- 1. Profiles Table Upgrades
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- Index for trial expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires_at
  ON public.profiles(trial_expires_at);

-- 2. Coupons Table Upgrades (Usage Caps & Expiration)
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS times_redeemed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;

-- Allow authenticated admins full management access to coupons
DO $$ BEGIN
  CREATE POLICY "coupons_admin_all"
    ON public.coupons FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Payment Transactions Ledger Table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  amount_aed NUMERIC NOT NULL CHECK (amount_aed >= 0),
  plan_id TEXT NOT NULL DEFAULT 'monthly',
  promo_code TEXT,
  payment_gateway TEXT NOT NULL DEFAULT 'ziina',
  gateway_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id
  ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON public.payment_transactions(created_at DESC);

-- Enable RLS for payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
DO $$ BEGIN
  CREATE POLICY "payment_transactions_select_own"
    ON public.payment_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Admins have full access to payment transactions
DO $$ BEGIN
  CREATE POLICY "payment_transactions_admin_all"
    ON public.payment_transactions FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Marketing Campaigns Table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  audience TEXT NOT NULL DEFAULT 'all',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_trigger
  ON public.marketing_campaigns(trigger_type);

-- Enable RLS for marketing_campaigns
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "marketing_campaigns_admin_all"
    ON public.marketing_campaigns FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Seed default lifecycle drip triggers
INSERT INTO public.marketing_campaigns (title, trigger_type, subject, content_html, is_active, audience)
VALUES
  (
    'Trial Day 3 Feature Discovery',
    'trial_day_3',
    'Discover Off-Plan Wholesale Pricing & Shortlist Exporting',
    '<p>Explore the full inventory of luxury off-plan developments across Dubai, download broker-ready branded brochures, and export curated client shortlists.</p>',
    true,
    'trial'
  ),
  (
    'Trial 24h Expiration Alert',
    'trial_expiring_24h',
    'Your 5-Day Free Trial expires tomorrow — Continue for 149 AED/mo',
    '<p>Your 5-day full-access trial ends tomorrow. Continue unlocking wholesale Dubai off-plan developments and priority developer launches for only 149 AED/month.</p>',
    true,
    'trial'
  ),
  (
    'Trial Expired Win-Back Offer',
    'trial_expired_winback',
    'Special 20% discount code to continue your Dubai access',
    '<p>We would love to keep partnering with your brokerage. Use promo code <strong>SPECIAL20</strong> to reactivate your access with an exclusive 20% savings.</p>',
    true,
    'expired'
  )
ON CONFLICT DO NOTHING;

-- 5. Email Dispatch Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  campaign_type TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'logged')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id
  ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at
  ON public.email_logs(sent_at DESC);

-- Enable RLS for email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "email_logs_admin_all"
    ON public.email_logs FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
