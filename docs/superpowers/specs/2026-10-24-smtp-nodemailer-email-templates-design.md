# System Design: Nodemailer Direct SMTP Integration, OTP Verification & Luxury Email Template Suite

**Date:** 2026-10-24  
**Status:** Ready for User Approval (Builder Check Passed)  
**Target Architecture:** React 18, Vite, TypeScript, Tailwind CSS, Supabase (PostgreSQL, RLS, Edge Functions under Deno runtime), Nodemailer via npm compatibility  

---

## 1. Intent and Why
Realtor Buddy requires an autonomous, resilient email delivery infrastructure that completely bypasses Supabase's built-in email rate limits and auth-only email restrictions. Mirroring the proven production setup from Stylofista Gents Salon, the system adopts **Nodemailer** over standard SMTP to deliver transactional notifications, broker onboarding drips, payment receipts, and marketing broadcasts directly from our configured email server.

Additionally, to ensure email hygiene, prevent bot registrations, and protect high-value Dubai off-plan developer data, the onboarding process introduces **secure 6-digit Email OTP Verification** for broker accounts.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Nodemailer SMTP Delivery Engine:** Re-architect the existing serverless Supabase Edge Function ([`email-dispatcher`](file:///Users/Monil_149/Documents/Realtor%20Buddy/supabase/functions/email-dispatcher/index.ts)) to use `npm:nodemailer` under Deno, configuring SMTP parameters via environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`).
- **Supabase Limit Bypass:** Ensure all emails (system transactions, OTP codes, drip notifications, and admin marketing blasts) bypass Supabase's built-in project email rate limits (e.g. 3/hr tier caps) by routing directly through external SMTP transport.
- **Email OTP Verification System:** 
  - Generate cryptographically secure 6-digit numeric passcodes stored with salted SHA-256 hashes or direct tokens in a new `broker_otps` table.
  - 10-minute expiry window (`expires_at = now() + interval '10 minutes'`).
  - Strict rate limiting: max 3 OTP requests per email per hour, and maximum 5 incorrect attempts before invalidating.
  - Dedicated verification endpoints: `send-otp` and `verify-otp`.
- **Complete 8-Template Luxury Email Suite:** Implement responsive, inline-styled luxury HTML email templates matching Realtor Buddy's **Obsidian Noir (`#090D15`)** and **Champagne Gold (`#D4AF37`)** brand identity:
  1. `otp_verification`: Prominent 6-digit code box, security alert, and expiration countdown.
  2. `broker_welcome_trial`: VIP onboarding guide, trial expiration reminder (5 days), and direct link to off-plan inventory.
  3. `trial_day_3`: Feature discovery highlighting Dubai off-plan wholesale pricing, ROI analytics, and PDF brochure export.
  4. `trial_expiring_24h`: Urgent 24-hour expiration alert with 1-click continuation link for 149 AED/month.
  5. `trial_expired_winback`: Re-engagement recovery offer with 20% discount coupon (`SPECIAL20`).
  6. `payment_receipt`: Transaction confirmation for 149 AED Ziina payments with invoice ID, timestamp, and active VIP perks.
  7. `property_review_status`: Broker notification when a submitted off-plan development is approved or requires edits.
  8. `admin_broadcast`: Flexible container for bespoke announcements and newsletters dispatched from the admin command center.
- **Dynamic Variable Interpolation:** Support template placeholders like `{{code}}`, `{{broker_name}}`, `{{expiry_minutes}}`, `{{property_title}}`, `{{invoice_id}}`, etc.
- **Fallback Resilience:** Gracefully fall back to database logging in `email_logs` and console output when SMTP credentials are not yet configured in local test or offline environments.

### Non-Goals
- In-browser visual drag-and-drop template designer (all templates are pre-engineered, tested, and responsive HTML email structures).
- SMS/WhatsApp OTP delivery (this system is dedicated strictly to email SMTP; WhatsApp remains a direct concierge link).
- Replacing the existing Ziina payment gateway (the receipt email simply listens to Ziina payment successes).

### Anti-Goals
- Never expose SMTP passwords, username, or server secrets to client-side bundles or public repositories.
- Do not make registration impossible if SMTP is temporarily unreachable in dev mode; provide a dev-mode fallback code or mock bypass.
- Do not alter the single 149 AED/month pricing model or the 5-day free trial rule.

---

## 3. Constraints
- **Runtime:** Supabase Edge Functions execute in Deno with npm specifier support (`import nodemailer from "npm:nodemailer@^6.9.16"`).
- **Styling:** Email clients (Apple Mail, Outlook, Gmail, Superhuman) have strict rendering engines. Templates must use table-based responsive layouts with inline CSS, web-safe fallback fonts (`Cinzel`, `Inter`, Georgia, sans-serif), and high-contrast accessibility against `#090D15`.
- **Database Schema:** Tables and migrations must execute cleanly on PostgreSQL with appropriate Row Level Security (RLS) policies.
- **Test Integrity:** All existing 173 Vitest tests must continue passing without regression.

---

## 4. Approaches Considered

### Approach 1: Unified Serverless Edge Dispatcher with Nodemailer (Selected)
- **Architecture:** Upgrade `supabase/functions/email-dispatcher/index.ts` to integrate Nodemailer via `npm:nodemailer`. Handle both transactional triggers (like OTP generation and verification) and batch marketing broadcasts. Store OTP records in a dedicated `broker_otps` table with row-level security.
- **Why Chosen:** 
  - Zero extra hosting cost or server maintenance.
  - Keeps SMTP credentials strictly on the backend.
  - Completely bypasses Supabase auth email limits.
  - Unifies template rendering and delivery in one testable service.

### Approach 2: Standalone Express / Node.js Microservice (Rejected)
- **Architecture:** Deploy a separate Node.js server (e.g. on Render or a VPS) that Realtor Buddy calls via HTTP REST.
- **Why Rejected:** Introduces unnecessary infrastructure complexity, separate server hosting costs, cross-origin latency, and duplicate deployment pipelines for an app already fully powered by Supabase Edge Functions.

---

## 5. Detailed Technical Architecture

### 5.1 Database Migration (`broker_otps` & `profiles.email_verified`)
Create a new migration `supabase/migrations/20261024040000_broker_otps.sql`:
```sql
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
```

### 5.2 Edge Function Enhancements (`email-dispatcher`) & Access Control
The `email-dispatcher` implements route-level authorization:
- `send_otp` and `verify_otp` are **publicly accessible** (with IP/email rate limits) to allow unauthenticated prospective brokers to register.
- `send_email` and batch broadcasts strictly **require an authenticated Supabase Admin JWT** (`role = 'admin'`).

The function handles three primary routes/actions:

1. **`action: 'send_otp'`**
   - Receives: `{ email: string, purpose?: string }`
   - Validates rate limit (max 3 in last 60 minutes).
   - Generates 6-digit cryptographically secure random number (`100000` to `999999`).
   - Inserts row into `broker_otps` with `expires_at = now() + 10 mins`.
   - Dispatches `otp_verification` email via Nodemailer SMTP transporter.
   - Returns `{ success: true, message: 'OTP sent successfully' }`.

2. **`action: 'verify_otp'`**
   - Receives: `{ email: string, otp_code: string, purpose?: string }`
   - Finds latest unconsumed, unexpired OTP for email.
   - Checks attempts; increments `attempts`. If `attempts > max_attempts`, invalidates.
   - If match: marks `consumed_at = now()`, marks profile `email_verified = true` (if user exists).
   - Returns `{ success: true, verified: true }`.

3. **`action: 'send_email'` / Batch Broadcasts (Admin Protected)**
   - Requires Supabase Admin authorization.
   - Receives: `{ to?: string[], audience?: string, template: string, subject: string, data?: Record<string, any>, htmlContent?: string }`
   - Renders matching luxury template with interpolated variables.
   - Dispatches via Nodemailer transporter with connection pooling.
   - Logs result in `email_logs`.

### 5.3 Onboarding Sequencing & Registration Gating
As decided by the user, **brokers must verify their 6-digit OTP before their account is activated**:
1. Prospective broker fills in the registration form (Name, Agency, WhatsApp, Email, Password).
2. On submit, the system triggers `send_otp` via Nodemailer and opens an elegant Obsidian & Gold 6-digit OTP Modal.
3. The broker enters the 6-digit code received in their inbox.
4. Client calls `verify_otp`. Upon successful validation:
   - Account is officially created/activated with `email_verified = true` and `subscription_status = 'trial'` (5-day expiry).
   - The `broker_welcome_trial` email is automatically dispatched via Nodemailer.
   - Broker is logged into Realtor Buddy and redirected to the VIP dashboard.

### 5.4 SMTP Configuration Environment Variables
- `SMTP_HOST`: e.g. `smtp.gmail.com` or custom mail host
- `SMTP_PORT`: `465` (SSL) or `587` (TLS)
- `SMTP_SECURE`: `true` for port 465, `false` for port 587
- `SMTP_USER`: Sender email address (e.g. `concierge@realtorbuddy.ae` or `mswebdevelopments.uae@gmail.com`)
- `SMTP_PASS`: SMTP app password / mail token
- `SMTP_FROM`: `"Realtor Buddy VIP Concierge" <concierge@realtorbuddy.ae>`

### 5.5 The 8 Luxury Email Templates
All emails use the Obsidian Noir (`#090D15`) master layout with Cinzel headings, hairline gold borders (`rgba(212, 175, 55, 0.35)`), and Champagne Gold CTA buttons:
- **`otp_verification`**: Headline: "Broker Verification Code". Contains an extra-large 32px letter-spaced `#D4AF37` code box with a 10-minute validity disclaimer.
- **`broker_welcome_trial`**: Headline: "Welcome to Realtor Buddy VIP". Highlights the 5-Day Complimentary Trial, verified off-plan listings, and direct support.
- **`trial_day_3`**: Headline: "Unlock Exclusive Off-Plan Intelligence". Demos client shortlist export, ROI calculator, and developer commission data.
- **`trial_expiring_24h`**: Headline: "Your VIP Access Expires in 24 Hours". Prompts continuation for 149 AED/month.
- **`trial_expired_winback`**: Headline: "Partner Privilege: 20% Off Your Membership". Delivers voucher code `SPECIAL20`.
- **`payment_receipt`**: Headline: "VIP Membership Confirmation & Receipt". Displays transaction amount (149 AED), payment provider (Ziina), invoice reference, and renewal date.
- **`property_review_status`**: Headline: "Off-Plan Listing Status Update". Informs broker if their submitted property was approved or feedback provided.
- **`admin_broadcast`**: Dynamic headline and editorial body with luxury styling for admin newsletters and alerts.

### 5.6 Client-Side Integration (`authService.ts` & `AdminMarketing.tsx`)
- In `authService.ts`: Add `sendEmailOtp(email: string)` and `verifyEmailOtp(email: string, code: string)`.
- In broker registration flow: Display OTP modal / input step before account creation is completed.
- In `AdminMarketing.tsx`: Display email template catalog previewer and test dispatcher.

---

## 6. What's Left to the Builder
- Precise inline CSS email client compatibility tweaks (MSO conditional comments for Outlook desktop, if needed).
- Vitest mock fixtures for Nodemailer transporter in local test runs.
- Fallback mock verification behavior when offline or running in sandbox test mode without live SMTP keys.
