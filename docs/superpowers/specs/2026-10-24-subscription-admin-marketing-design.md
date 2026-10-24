# System Design: Unified 149 AED Subscription, 5-Day Free Trial & Admin Marketing Command Center

**Date:** 2026-10-24  
**Status:** Approved by Builder Review / Ready for User Approval  
**Target Architecture:** React 18, Vite, TypeScript, Tailwind CSS, Supabase (PostgreSQL, RLS, Storage, Edge Functions), Ziina Gateway  

---

## 1. Intent and Why
Realtor Buddy is streamlining its commercial model to minimize friction and maximize broker adoption across Dubai. We are replacing the previous 499 AED/month and 4,990 AED/year structure with a single, highly accessible **149 AED/month** subscription and granting every newly registered broker an automatic **5-day free trial tier** with full access to confidential wholesale developer inventories and client shortlist generation tools.

To manage and grow this subscriber base, the platform requires an executive Admin Command Center at `/admin` featuring:
1. **Subscriptions & Revenue Dashboard:** Real-time visibility into Monthly Recurring Revenue (MRR), active trials, paying members, and manual subscription management.
2. **Promotional Codes Manager:** Dynamic creation and lifecycle tracking of discount vouchers.
3. **Automated Marketing Panel:** One-click toggles for high-converting lifecycle drip emails (Day 3 check-in, 24-hour expiration notice, trial-expired win-back offer).
4. **Broadcast Email Sender:** Targeted broadcast announcements sent via a Supabase Edge Function with pluggable email provider adapters (Resend, SMTP, or sandbox logger).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Single Plan Simplicity:** Consolidate subscription offerings into a single **149 AED/month** tier (`SUBSCRIPTION_PLANS.monthly`), cleanly aliasing legacy annual references.
- **5-Day Free Trial Onboarding:** Provision every newly registered broker with `subscription_status = 'trial'` and `trial_expires_at = now() + 5 days` without requiring payment information upfront.
- **Paywall Strategy (Soft/Paused):** Prepare all paywall infrastructure and trial-expiration redirect routes, but **keep active paywall blocking temporarily commented out/paused** during development to prevent permission lockouts, as explicitly requested by the user.
- **Admin Command Suite:** Upgrade `/admin` into a tabbed executive portal:
  - **Listing Approvals:** Existing verification queue for off-plan properties.
  - **Subscriptions & Revenue:** Live Contracted MRR (`Active Subscribers × 149 AED`), 30-Day Cash Collected, trial counts, and a broker directory with manual trial extensions.
  - **Promos & Vouchers:** Dynamic database-backed promo creation with custom percentage or flat AED discounts, expiration dates, and usage caps.
  - **Automated Marketing & Email Dispatcher:** Pre-set trigger toggles and manual broadcast composer with server-side audience filtering.
- **Serverless Pluggable Email Engine:** Implement a Supabase Edge Function (`email-dispatcher`) supporting pluggable delivery adapters (Resend, SendGrid, SMTP, or sandbox logger).

### Non-Goals
- Real-time card chargebacks or automated dispute resolution (managed directly in Ziina's merchant dashboard).
- Drag-and-drop visual email template builder (emails use high-end, responsive Dubai luxury editorial HTML templates).
- Mandatory upfront credit card collection for starting the 5-day free trial.

### Anti-Goals
- Do not permanently delete or dismantle the existing paywall gate; keep it cleanly commented out with clear `TODO` markers for final production launch.
- Do not expose email provider API keys, webhook secrets, or service role credentials in client bundle.
- Do not break existing public property sharing (`/share/:token`) or client shortlist views (`/shortlist/:token`).

---

## 3. Constraints
- **Paywall Status:** Active paywall blocking is paused/commented out during current development as requested.
- **Design System Cohesion:** Strict alignment with Warm Alabaster (`#FAF8F5`), Obsidian Noir (`#090D15`), and Champagne Gold accents (`#D4AF37`) with Cinzel/Plus Jakarta Sans typography.
- **Testing Standard:** Maintain 100% pass rate across Vitest suites (currently 173 tests) and clean `npm run build`.

---

## 4. Approaches Considered

### Approach 1: Full Serverless Edge Pipeline with Pluggable Dispatcher (Selected)
- **Architecture:** 
  - Database schema upgrades in Supabase: add `email` and `trial_expires_at` to `profiles`, create `payment_transactions`, `marketing_campaigns`, and `email_logs`. Upgrade existing `coupons` table with usage tracking.
  - Serverless Edge Function `email-dispatcher` with adapter pattern (mock logger for dev/testing, Resend/SMTP for live).
  - Dual-mode trigger execution: on-demand admin broadcasts and scheduled lifecycle sweeps with idempotency.
  - Multi-tab Admin Hub at `/admin` containing Approvals, Subscriptions & Revenue, Promos, and Marketing/Email Dispatch.
- **Trade-offs:** Requires initial migration and Edge Function, but provides enterprise security, persistent promo management, background drip readiness, and vendor decoupling.
- **Decision:** Selected by user.

### Approach 2: On-Demand Client-Triggered Dispatcher
- **Trade-offs:** Unreliable trigger delivery if neither broker nor admin visits on the scheduled expiration day.
- **Decision:** Rejected.

---

## 5. Detailed Component & System Specifications

### 5.1 Subscription & Trial Architecture
1. **Plan Configuration (`src/services/paymentService.ts`):**
   - Single plan: `monthly` (149 AED / month, `priceAed: 149`, interval: `'month'`).
   - Legacy annual plan references deprecated and aliased to monthly.
2. **Registration Provisioning (`src/services/authService.ts`):**
   - On broker registration, store:
     - `email`: synced from registration form into `profiles.email`
     - `subscription_status`: `'trial'`
     - `created_at`: current ISO timestamp
     - `trial_expires_at`: current timestamp + 5 days (`new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()`)
3. **Trial Banner (`src/components/layout/Navbar.tsx` & `/profile`):**
   - For brokers with `subscription_status === 'trial'`, render a luxury status badge: `5-Day Free Trial (X days remaining)`.
   - Direct button to upgrade for 149 AED/mo.
4. **Paywall Gate Status (`src/components/auth/PaywallGate.tsx` & `src/App.tsx`):**
   - Retain full paywall component implementation and unit tests intact.
   - Comment out active blocking check with explicit release comment:
     ```tsx
     // [PAUSED FOR NOW: Re-enable for final production launch]
     // if (userProfile && isTrialExpired(userProfile) && userProfile.subscription_status !== 'active') {
     //   return <PaywallGate ... />;
     // }
     ```

### 5.2 Dynamic Promotions Schema
Upgrade the existing `public.coupons` table in Supabase via migration `20261024030000_subscription_admin_marketing.sql`:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `code TEXT UNIQUE NOT NULL`
- `discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_aed'))`
- `discount_value NUMERIC NOT NULL`
- `description TEXT`
- `is_active BOOLEAN DEFAULT true`
- `max_uses INT DEFAULT 100`
- `times_redeemed INT DEFAULT 0`
- `valid_until TIMESTAMPTZ`
- `created_at TIMESTAMPTZ DEFAULT now()`

### 5.3 Revenue & Transaction Ledger
Create `public.payment_transactions`:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id UUID REFERENCES public.profiles(id)`
- `user_email TEXT NOT NULL`
- `amount_aed NUMERIC NOT NULL`
- `plan_id TEXT DEFAULT 'monthly'`
- `promo_code TEXT`
- `payment_gateway TEXT DEFAULT 'ziina'`
- `gateway_session_id TEXT`
- `status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))`
- `created_at TIMESTAMPTZ DEFAULT now()`

### 5.4 Admin Command Center (`src/pages/admin/AdminDashboard.tsx`)
Multi-tab luxury container replacing the isolated approvals page:
- **Tab 1: Property Approvals (`AdminApprovals.tsx`):**
  - Existing verification queue for off-plan property brochures, photos, and wholesale specifications.
- **Tab 2: Subscriptions & Revenue (`AdminSubscriptions.tsx`):**
  - **KPI Row:**
    - *Contracted MRR:* `active_subscribers_count × 149 AED`
    - *30-Day Cash Collected:* Sum of completed payments in last 30 days
    - *Active Paying Members:* Count of accounts with `subscription_status = 'active'`
    - *Trial Pipeline:* Count of accounts where `subscription_status = 'trial'` and `trial_expires_at > now()`
  - **Broker Accounts Directory:** Live searchable table of all registered brokers (Name, Agency, Email, Status, Trial Days Remaining, Action to "Extend Trial by 5 Days" or "Grant VIP Access").
  - **Transactions Ledger:** Recent payment transactions with Ziina reference and AED amounts.
- **Tab 3: Promotional Vouchers (`AdminPromos.tsx`):**
  - Table of active and expired codes, discount types, redemption counts (`times_redeemed / max_uses`), and expiration dates.
  - "Create Promo Code" modal with validation (uppercase code, percentage or fixed AED amount, usage cap).
  - Quick toggle to activate/deactivate vouchers instantly.
- **Tab 4: Marketing & Email Dispatcher (`AdminMarketing.tsx`):**
  - **Automated Drip Triggers (Pre-set Toggles):**
    - *Trigger 1 (Day 3 Check-In):* "Discover Off-Plan Wholesale Pricing & Shortlist Exporting" (Toggle On/Off, preview button).
    - *Trigger 2 (24h Expiration Alert):* "Your 5-Day Free Trial expires tomorrow — Continue for 149 AED/mo" (Toggle On/Off).
    - *Trigger 3 (Trial Expired Offer):* "Special 20% discount code to continue your Dubai access" (Toggle On/Off).
  - **Broadcast Composer:**
    - Audience Filter dropdown: *All Brokers*, *Active Paid Brokers*, *In-Trial Brokers*, *Expired Brokers*.
    - Subject line input and rich HTML content area.
    - Live visual preview in luxury Dubai editorial container.
    - "Send Campaign" button invoking the Supabase Edge Function.

### 5.5 Supabase Edge Function (`supabase/functions/email-dispatcher/index.ts`)
- **Serverless Endpoint:** Dispatches branded emails with pluggable provider:
  - If `RESEND_API_KEY` is configured: sends via Resend REST API.
  - If SMTP credentials are configured: sends via SMTP transporter.
  - Fallback / Sandbox: logs the rendered HTML email payload to the Supabase console and records entry into `email_logs`.
- **Audience Resolution & Personalization:** Accepts either direct recipients or `{ audience: 'all' | 'trial' | 'active' | 'expired' }`. Resolves recipient list server-side via `service_role` to prevent exposing broker emails to each other, and personalizes greeting with the broker's full name.
- **Idempotency:** Records every sent email in `email_logs (user_id, campaign_type, sent_at)`. Prevents sending duplicate milestone triggers to the same broker.

---

## 6. Builder Decisions Made (Minor / Settled Internally)
1. **Broker Email Sync:** Added `email TEXT` to `public.profiles` in migration `20261024030000_subscription_admin_marketing.sql` to allow clean directory display and audience filtering without cross-schema joins.
2. **Dynamic Trial Evaluation:** `isTrialExpired(profile)` evaluates `trial_expires_at < now()`, ensuring live status calculations without requiring recurring database batch mutations.
3. **Dual MRR Metric:** Subscriptions tab displays both **Contracted Run-Rate MRR** (`active_subscribers × 149 AED`) and **30-Day Net Cash Collected** from `payment_transactions`.
4. **Server-Side Broadcast Resolution:** The frontend passes the target audience segment identifier, and the Edge Function resolves individual recipients server-side, protecting broker privacy (no CC/BCC header leaks) and personalizing broker names.
5. **Coupons Schema Evolution:** Upgrades the existing `public.coupons` table with `max_uses` and `times_redeemed`, preserving backwards compatibility with existing coupon codes (`SPECIAL20`, `VIP100`).
6. **Paywall Soft Pause:** Paywall gate code and unit tests remain intact in `PaywallGate.tsx` and `PaywallGate.test.tsx`, with the active blocking check in `App.tsx` commented out and labeled with `// [PAUSED: TODO for final launch]`.
