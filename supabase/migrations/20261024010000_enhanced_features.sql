-- Realtor Buddy: Enhanced Features Migration
-- Version: 20261024010000
-- Features: Device Concurrency Lock (Max 3 Logins), Coupons, Referrals, Feedback & Complaints

-- 1. Device Sessions Table (Max 3 concurrent devices per user)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  device_name text NOT NULL,
  browser text NOT NULL,
  os text NOT NULL,
  ip_address text,
  session_token text NOT NULL,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast session lookup by user and active status
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON public.user_sessions(user_id, is_active);

-- Enable RLS for user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_sessions_select_own"
    ON public.user_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_sessions_insert_own"
    ON public.user_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_sessions_update_own"
    ON public.user_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_aed')),
  discount_value numeric NOT NULL,
  description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial launch vouchers
INSERT INTO public.coupons (code, discount_type, discount_value, description)
VALUES
  ('SPECIAL20', 'percentage', 20, '20% Special Partner Discount'),
  ('VIP100', 'fixed_aed', 100, '100 AED Flat VIP Voucher'),
  ('LAUNCH100', 'percentage', 100, '100% Launch Pass (Free Trial Activation)')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS for coupons: authenticated and anonymous can validate active coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "coupons_read_active"
    ON public.coupons FOR SELECT
    TO anon, authenticated
    USING (is_active = true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rewarded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_code
  ON public.referrals(referral_code);

-- Enable RLS for referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "referrals_select_own"
    ON public.referrals FOR SELECT
    TO authenticated
    USING (auth.uid() = referrer_id OR auth.uid() = referee_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Feedback & Complaints Submissions Table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  brief text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  page_url text,
  recipient_email text NOT NULL DEFAULT 'mswebdevelopments.uae@gmail.com',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for feedback submissions: allow public and authenticated to insert
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "feedback_submissions_insert_all"
    ON public.feedback_submissions FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "feedback_submissions_admin_read"
    ON public.feedback_submissions FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
