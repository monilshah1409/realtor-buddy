-- Realtor Buddy: Seed Broker & Admin Profiles, RLS Policies & Luxury Properties
-- Migration: 20261024040000_seed_profiles_and_properties.sql
-- Enables seamless authentication, public property discovery, and seeds live properties.

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. UPGRADE PROFILES SCHEMA (Add email & trial_expires_at if missing)
-- ====================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- Index for trial expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires_at
  ON public.profiles(trial_expires_at);

-- ====================================================================
-- 2. SEED BROKER & ADMIN USERS IN auth.users & public.profiles
-- ====================================================================

DO $$
DECLARE
  broker_uid UUID := '706de559-d7aa-471b-95b1-167ce36fb1f1';
  admin_uid UUID  := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- 2.1 Broker User in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = broker_uid OR email = 'realtorbuddy.broker@gmail.com') THEN
    UPDATE auth.users
    SET
      encrypted_password = crypt('DubaiBroker2026!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Karim Al-Sayed","agency_name":"Premier Dubai Properties","whatsapp_number":"+971501234567"}'::jsonb,
      updated_at = now()
    WHERE id = broker_uid OR email = 'realtorbuddy.broker@gmail.com';
  ELSE
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      broker_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'realtorbuddy.broker@gmail.com',
      crypt('DubaiBroker2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Karim Al-Sayed","agency_name":"Premier Dubai Properties","whatsapp_number":"+971501234567"}'::jsonb,
      now(),
      now()
    );
  END IF;

  -- 2.2 Broker Profile in public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    agency_name,
    phone_number,
    whatsapp_number,
    avatar_url,
    role,
    status,
    subscription_status,
    email,
    trial_expires_at,
    created_at,
    updated_at
  ) VALUES (
    broker_uid,
    'Karim Al-Sayed',
    'Premier Dubai Properties',
    '+971501234567',
    '+971501234567',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    'agent',
    'active',
    'active',
    'realtorbuddy.broker@gmail.com',
    now() + interval '5 days',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    agency_name = EXCLUDED.agency_name,
    whatsapp_number = EXCLUDED.whatsapp_number,
    role = 'agent',
    status = 'active',
    subscription_status = 'active',
    email = EXCLUDED.email,
    updated_at = now();

  -- 2.3 Admin User in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = admin_uid OR email = 'realtorbuddy.admin@gmail.com') THEN
    UPDATE auth.users
    SET
      encrypted_password = crypt('DubaiAdmin2026!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Monil & Edwin Admin","agency_name":"Realtor Buddy HQ","whatsapp_number":"+971509998877"}'::jsonb,
      updated_at = now()
    WHERE id = admin_uid OR email = 'realtorbuddy.admin@gmail.com';
  ELSE
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      admin_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'realtorbuddy.admin@gmail.com',
      crypt('DubaiAdmin2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Monil & Edwin Admin","agency_name":"Realtor Buddy HQ","whatsapp_number":"+971509998877"}'::jsonb,
      now(),
      now()
    );
  END IF;

  -- 2.4 Admin Profile in public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    agency_name,
    phone_number,
    whatsapp_number,
    avatar_url,
    role,
    status,
    subscription_status,
    email,
    created_at,
    updated_at
  ) VALUES (
    admin_uid,
    'Monil & Edwin Admin',
    'Realtor Buddy HQ',
    '+971509998877',
    '+971509998877',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    'admin',
    'active',
    'active',
    'realtorbuddy.admin@gmail.com',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    agency_name = EXCLUDED.agency_name,
    whatsapp_number = EXCLUDED.whatsapp_number,
    role = 'admin',
    status = 'active',
    subscription_status = 'active',
    email = EXCLUDED.email,
    updated_at = now();

END $$;

-- ====================================================================
-- 3. PERMISSIONS & ROW-LEVEL SECURITY POLICIES FOR PROPERTIES & PROFILES
-- ====================================================================

-- Grant table access to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON public.properties TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Allow anon and authenticated to view global or created properties
DO $$ BEGIN
  DROP POLICY IF EXISTS "properties_agent_select" ON public.properties;
  DROP POLICY IF EXISTS "properties_public_select" ON public.properties;
  DROP POLICY IF EXISTS "allow_public_and_agent_select" ON public.properties;

  CREATE POLICY "allow_public_and_agent_select"
    ON public.properties
    FOR SELECT
    TO anon, authenticated
    USING (
      status = 'global'
      OR (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR public.is_admin()))
      OR share_token IS NOT NULL
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Allow anon and authenticated to insert properties seamlessly
DO $$ BEGIN
  DROP POLICY IF EXISTS "properties_agent_insert" ON public.properties;
  DROP POLICY IF EXISTS "allow_seamless_property_insert" ON public.properties;

  CREATE POLICY "allow_seamless_property_insert"
    ON public.properties
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Allow updates by creator or admin
DO $$ BEGIN
  DROP POLICY IF EXISTS "properties_agent_update" ON public.properties;
  DROP POLICY IF EXISTS "allow_agent_admin_property_update" ON public.properties;

  CREATE POLICY "allow_agent_admin_property_update"
    ON public.properties
    FOR UPDATE
    TO anon, authenticated
    USING (
      auth.uid() IS NULL
      OR created_by = auth.uid()
      OR public.is_admin()
    )
    WITH CHECK (
      auth.uid() IS NULL
      OR created_by = auth.uid()
      OR public.is_admin()
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Auto-fill default created_by trigger if omitted or invalid
CREATE OR REPLACE FUNCTION public.handle_property_default_creator()
RETURNS trigger AS $$
BEGIN
  IF NEW.created_by IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.created_by) THEN
    NEW.created_by := '706de559-d7aa-471b-95b1-167ce36fb1f1'::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_property_default_creator ON public.properties;
CREATE TRIGGER trg_property_default_creator
  BEFORE INSERT ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.handle_property_default_creator();

-- ====================================================================
-- 4. INSERT REAL PROPERTIES DIRECTLY INTO public.properties
-- ====================================================================

-- 4.1 Burj Crown Luxury Residence (Downtown Dubai)
INSERT INTO public.properties (
  id,
  title,
  description,
  property_type,
  locality,
  sub_community,
  handover_status,
  handover_date,
  price_aed,
  developer_name,
  area_sqft,
  bedrooms,
  bathrooms,
  latitude,
  longitude,
  photos,
  brochure_onedrive_url,
  brochure_file_name,
  status,
  created_by,
  approved_by,
  share_token,
  created_at,
  updated_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Burj Crown Luxury Residence',
  'Breathtaking 1-bedroom apartment directly facing Burj Khalifa with floor-to-ceiling panoramic glass, premium marble finishing, and infinity leisure deck.',
  '1bhk',
  'Downtown Dubai',
  'Opera District',
  'ready',
  'Ready to Move In',
  1600000,
  'Emaar Properties',
  850,
  1,
  2,
  25.1972,
  55.2744,
  ARRAY[
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
  ],
  'https://aii01-my.sharepoint.com/:b:/g/personal/monilshah_ict22_adaniuni_ac_in/IQBuRdkUq0YjSKhGKFBCDsz5AWGHdSokp_M5mGFJIWui6C8',
  'Burj_Crown_Executive_Brochure.pdf',
  'global',
  '706de559-d7aa-471b-95b1-167ce36fb1f1',
  'a0000000-0000-0000-0000-000000000001',
  'burj-crown-1bhk-luxury',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_aed = EXCLUDED.price_aed,
  photos = EXCLUDED.photos,
  brochure_onedrive_url = EXCLUDED.brochure_onedrive_url,
  status = 'global',
  updated_at = now();

-- 4.2 Chelsea Tower C Luxury Penthouse (Downtown Dubai)
INSERT INTO public.properties (
  id,
  title,
  description,
  property_type,
  locality,
  sub_community,
  handover_status,
  handover_date,
  price_aed,
  developer_name,
  area_sqft,
  bedrooms,
  bathrooms,
  latitude,
  longitude,
  photos,
  brochure_onedrive_url,
  brochure_file_name,
  status,
  created_by,
  approved_by,
  share_token,
  created_at,
  updated_at
) VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'Chelsea Tower C Luxury Penthouse',
  'Ultra-luxury high-floor 3-bedroom penthouse with direct panoramic skyline views, private plunge pool, and floor-to-ceiling glass.',
  'penthouse',
  'Downtown Dubai',
  'Financial Centre Road',
  'ready',
  'Ready to Move In',
  4850000,
  'Chelsea Developments',
  2750,
  3,
  4,
  25.2084,
  55.2719,
  ARRAY[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
  ],
  'https://aii01-my.sharepoint.com/:b:/g/personal/monilshah_ict22_adaniuni_ac_in/IQBuRdkUq0YjSKhGKFBCDsz5AWGHdSokp_M5mGFJIWui6C8',
  'Chelsea_Tower_C_Brochure.pdf',
  'global',
  '706de559-d7aa-471b-95b1-167ce36fb1f1',
  'a0000000-0000-0000-0000-000000000001',
  'chelsea-tower-c-penthouse',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_aed = EXCLUDED.price_aed,
  photos = EXCLUDED.photos,
  brochure_onedrive_url = EXCLUDED.brochure_onedrive_url,
  status = 'global',
  updated_at = now();

-- 4.3 Marina Gate Waterfront Living (Dubai Marina)
INSERT INTO public.properties (
  id,
  title,
  description,
  property_type,
  locality,
  sub_community,
  handover_status,
  handover_date,
  price_aed,
  developer_name,
  area_sqft,
  bedrooms,
  bathrooms,
  latitude,
  longitude,
  photos,
  brochure_onedrive_url,
  brochure_file_name,
  status,
  created_by,
  approved_by,
  share_token,
  created_at,
  updated_at
) VALUES (
  'd0000000-0000-0000-0000-000000000003',
  'Marina Gate Waterfront Living',
  'Stunning high-floor 2-bedroom with direct Marina promenade views, open designer kitchen, and private terrace.',
  '2bhk',
  'Dubai Marina',
  'Marina Gate 2',
  'near_handover',
  'Q4 2026',
  2450000,
  'Select Group',
  1220,
  2,
  2,
  25.0805,
  55.1403,
  ARRAY[
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
  ],
  'https://aii01-my.sharepoint.com/:b:/g/personal/monilshah_ict22_adaniuni_ac_in/IQBuRdkUq0YjSKhGKFBCDsz5AWGHdSokp_M5mGFJIWui6C8',
  'Marina_Gate_Brochure.pdf',
  'global',
  '706de559-d7aa-471b-95b1-167ce36fb1f1',
  'a0000000-0000-0000-0000-000000000001',
  'marina-gate-waterfront-2bhk',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_aed = EXCLUDED.price_aed,
  photos = EXCLUDED.photos,
  brochure_onedrive_url = EXCLUDED.brochure_onedrive_url,
  status = 'global',
  updated_at = now();
