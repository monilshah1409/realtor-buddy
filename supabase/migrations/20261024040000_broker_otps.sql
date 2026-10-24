-- Add email_verified flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Table to store temporary OTPs
CREATE TABLE IF NOT EXISTS public.broker_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'verification', -- 'verification' | 'password_reset' | 'login'
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_otps_email_purpose 
ON public.broker_otps (email, purpose, created_at DESC);

-- Enable RLS
ALTER TABLE public.broker_otps ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role manages broker_otps"
ON public.broker_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
