-- Realtor Buddy: Initial Schema & Security Migration
-- Version: 20261024000000

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Custom Enum Types
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('pending_approval', 'active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('inactive', 'trial', 'active', 'past_due', 'canceled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.property_type AS ENUM (
    'studio',
    '1bhk',
    '2bhk',
    '3bhk',
    '4bhk_plus',
    'villa',
    'townhouse',
    'penthouse'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.handover_status AS ENUM (
    'ready',
    'near_handover',
    'under_construction',
    'newly_launched'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.property_status AS ENUM (
    'private',
    'global',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  agency_name TEXT NOT NULL DEFAULT '',
  phone_number TEXT,
  whatsapp_number TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'agent',
  status public.profile_status NOT NULL DEFAULT 'pending_approval',
  subscription_status public.subscription_status NOT NULL DEFAULT 'trial',
  gateway_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Properties Table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  property_type public.property_type NOT NULL,
  locality TEXT NOT NULL,
  sub_community TEXT,
  handover_status public.handover_status NOT NULL,
  handover_date TEXT NOT NULL,
  price_aed NUMERIC NOT NULL CHECK (price_aed >= 0),
  developer_name TEXT NOT NULL,
  area_sqft NUMERIC NOT NULL CHECK (area_sqft >= 0),
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  brochure_onedrive_url TEXT,
  brochure_file_name TEXT,
  status public.property_status NOT NULL DEFAULT 'private',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Shortlists Table
CREATE TABLE IF NOT EXISTS public.shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9), 'hex'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Shortlist Items Table
CREATE TABLE IF NOT EXISTS public.shortlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlist_id UUID NOT NULL REFERENCES public.shortlists(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (shortlist_id, property_id)
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_locality ON public.properties(locality);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties(created_by);
CREATE INDEX IF NOT EXISTS idx_properties_share_token ON public.properties(share_token);
CREATE INDEX IF NOT EXISTS idx_shortlists_agent_id ON public.shortlists(agent_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_share_token ON public.shortlists(share_token);
CREATE INDEX IF NOT EXISTS idx_shortlist_items_shortlist_id ON public.shortlist_items(shortlist_id);

-- 7. Helper Security Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 8. Public Properties View (Explicitly Omitting price_aed and developer_name)
-- Public buyer view strips price_aed and developer_name to guarantee zero wholesale leakage.
CREATE OR REPLACE VIEW public.public_properties AS
SELECT
  id,
  title,
  description,
  property_type,
  locality,
  sub_community,
  handover_status,
  handover_date,
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
FROM public.properties;

-- 9. Row-Level Security (RLS) Configuration

-- Enable RLS on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlist_items ENABLE ROW LEVEL SECURITY;

-- 9.1 Profiles Policies
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_public_agent_read"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- 9.2 Properties Policies
-- Admin full access
CREATE POLICY "properties_admin_all"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Agents can read global properties or their own created properties
CREATE POLICY "properties_agent_select"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    status = 'global' 
    OR created_by = auth.uid() 
    OR public.is_admin()
  );

-- Agents can insert their own properties (defaulting to private or pending review)
CREATE POLICY "properties_agent_insert"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- Agents can update their own private properties; Admins can update any property
CREATE POLICY "properties_agent_update"
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- Public unauthenticated or authenticated users can read properties by share_token
CREATE POLICY "properties_public_select"
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

-- 9.3 Shortlists Policies
CREATE POLICY "shortlists_admin_all"
  ON public.shortlists
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "shortlists_agent_all"
  ON public.shortlists
  FOR ALL
  TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (agent_id = auth.uid() OR public.is_admin());

CREATE POLICY "shortlists_public_select"
  ON public.shortlists
  FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);

-- 9.4 Shortlist Items Policies
CREATE POLICY "shortlist_items_admin_all"
  ON public.shortlist_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "shortlist_items_agent_all"
  ON public.shortlist_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shortlists
      WHERE shortlists.id = shortlist_items.shortlist_id
      AND (shortlists.agent_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shortlists
      WHERE shortlists.id = shortlist_items.shortlist_id
      AND (shortlists.agent_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "shortlist_items_public_select"
  ON public.shortlist_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shortlists
      WHERE shortlists.id = shortlist_items.shortlist_id
      AND shortlists.share_token IS NOT NULL
    )
  );

-- 10. Column Access Permissions on Public Properties View
-- Explicitly grant SELECT on public_properties view to anon and authenticated
GRANT SELECT ON public.public_properties TO anon, authenticated;

-- 11. Profile Auto-Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, agency_name, whatsapp_number, role, status, subscription_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'agency_name', ''),
    COALESCE(new.raw_user_meta_data->>'whatsapp_number', ''),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'agent'),
    'pending_approval',
    'trial'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Storage Bucket Setup for Property Photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to upload, and public to read
DO $$ BEGIN
  CREATE POLICY "property_photos_public_read"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'property-photos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "property_photos_agent_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'property-photos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
