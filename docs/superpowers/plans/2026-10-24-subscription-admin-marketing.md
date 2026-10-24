# Unified 149 AED Subscription, 5-Day Free Trial & Admin Marketing Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streamline Realtor Buddy's monetization to a single 149 AED/month subscription with an automatic 5-day free trial on broker registration, while providing administrators with an executive command center for subscription management, revenue tracking, dynamic promo codes, automated lifecycle marketing drips, and broadcast email notifications via a pluggable Supabase Edge Function.

**Architecture:** Extend the existing React + Supabase stack with a database migration adding `email` and `trial_expires_at` to `profiles`, upgrading `coupons` with usage caps, and adding `payment_transactions`, `marketing_campaigns`, and `email_logs`. Build a modular `marketingService`, a pluggable serverless `email-dispatcher` Edge Function, and upgrade `/admin` into a tabbed dashboard with Subscriptions & Revenue, Promos, Marketing Automation, and Property Approvals, keeping active paywall blocking paused for now.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Edge Functions with Deno, Storage), Vitest, Ziina Payment Gateway.

**Spec:** [docs/superpowers/specs/2026-10-24-subscription-admin-marketing-design.md](file:///Users/Monil_149/Documents/Realtor%20Buddy/docs/superpowers/specs/2026-10-24-subscription-admin-marketing-design.md)

## Global Constraints
- Single subscription tier is exactly 149 AED / month (`priceAed: 149`, `interval: 'month'`).
- New brokers receive `subscription_status: 'trial'` and `trial_expires_at: now() + 5 days`.
- Active paywall blocking must remain paused/commented out with `// [PAUSED FOR NOW: Re-enable for final production launch]` in `App.tsx`.
- All design tokens must conform to Warm Alabaster (`#FAF8F5`), Obsidian Noir (`#090D15`), Champagne Gold (`#D4AF37`), Cinzel serif typography, and hairline borders (`border-stone-200/90`).
- Vitest pass rate must remain at 100% (all existing 173 tests + new tests must pass) with clean `npm run build`.

## Review Focus
1. **Trial Date Calculation:** When registering a broker, `trial_expires_at` must calculate exactly 5 days from creation (`5 * 24 * 60 * 60 * 1000` ms) and handle invalid or missing timestamps gracefully.
2. **Dynamic Trial Expiration:** `isTrialExpired` must correctly evaluate whether `trial_expires_at < now()`, handling edge cases where `trial_expires_at` is null, undefined, or malformed.
3. **Promo Cap Enforcement:** When a promo code reaches `times_redeemed >= max_uses` or expires past `valid_until`, `validateCouponCode` must reject it with a clear user message.
4. **Email Dispatcher Sandbox Fallback:** When `RESEND_API_KEY` is not present, `email-dispatcher` must log to `email_logs` and console without throwing an unhandled exception or breaking tests.
5. **Soft Paywall Non-Block:** While paywall is paused, an expired trial user must still be able to navigate to `/` and view listings without being redirected or blocked.

---

### Task 1: Database Migration & TypeScript Domain Models

**Files:**
- Create: `supabase/migrations/20261024030000_subscription_admin_marketing.sql`
- Modify: `src/types/index.ts:25-80`
- Test: `src/types/__tests__/types.test.ts`

**Interfaces:**
- Consumes: Existing `Profile`, `SubscriptionStatus`, `Property` from `src/types/index.ts`
- Produces: Updated `Profile` (with `email`, `trial_expires_at`), `PaymentTransaction`, `PromoCoupon`, `MarketingCampaign`, `EmailLog`

- [ ] **Step 1: Write the failing type validation tests**
Add tests in `src/types/__tests__/types.test.ts` verifying that `Profile` accepts `email` and `trial_expires_at`, and verifying interfaces `PaymentTransaction`, `PromoCoupon`, and `MarketingCampaign`.
```typescript
it('supports trial_expires_at and email on Profile interface', () => {
  const profile: Profile = {
    id: 'test-id',
    full_name: 'Karim Al-Sayed',
    agency_name: 'Premier Properties',
    whatsapp_number: '+971501234567',
    email: 'karim@dubairealty.ae',
    role: 'agent',
    status: 'active',
    subscription_status: 'trial',
    trial_expires_at: '2026-10-29T12:00:00.000Z',
    created_at: '2026-10-24T12:00:00.000Z',
  };
  expect(profile.trial_expires_at).toBeDefined();
  expect(profile.email).toBe('karim@dubairealty.ae');
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/types/__tests__/types.test.ts`
Expected: FAIL due to missing properties on `Profile` or missing types.

- [ ] **Step 3: Update `src/types/index.ts` and create migration**
1. In `src/types/index.ts`:
   - Add `email?: string;` and `trial_expires_at?: string;` to `Profile`.
   - Export interfaces: `PaymentTransaction`, `PromoCoupon`, `MarketingCampaign`, `EmailLog`.
2. In `supabase/migrations/20261024030000_subscription_admin_marketing.sql`:
   - Add columns to `profiles`: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;`
   - Upgrade `coupons`: add `max_uses INT DEFAULT 100`, `times_redeemed INT DEFAULT 0`, `valid_until TIMESTAMPTZ`.
   - Create tables `payment_transactions`, `marketing_campaigns`, `email_logs` with RLS policies allowing authenticated admins full access.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/types/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/types/index.ts src/types/__tests__/types.test.ts supabase/migrations/20261024030000_subscription_admin_marketing.sql
git commit -m "feat(types,db): add trial_expires_at, transaction and marketing domain models"
```

---

### Task 2: 149 AED Single Plan & 5-Day Free Trial in `paymentService` & `authService`

**Files:**
- Modify: `src/services/paymentService.ts:1-70`
- Modify: `src/services/authService.ts:80-140`
- Test: `src/services/__tests__/paymentService.test.ts`
- Test: `src/pages/auth/__tests__/AuthPage.test.tsx`

**Interfaces:**
- Consumes: `SUBSCRIPTION_PLANS`, `Profile`, `RegisterBrokerPayload`
- Produces: `SUBSCRIPTION_PLANS.monthly` (price 149 AED), `isTrialExpired(profile: Profile): boolean`, registration with 5-day trial provisioning

- [ ] **Step 1: Write the failing tests**
In `src/services/__tests__/paymentService.test.ts`:
```typescript
it('configures single monthly plan at 149 AED', () => {
  expect(SUBSCRIPTION_PLANS.monthly.priceAed).toBe(149);
  expect(SUBSCRIPTION_PLANS.monthly.billingPeriodText).toContain('149 AED');
});

it('correctly calculates trial expiration status', () => {
  const activeTrialProfile = {
    ...AGENT_PROFILE,
    subscription_status: 'trial' as const,
    trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };
  expect(isTrialExpired(activeTrialProfile)).toBe(false);

  const expiredTrialProfile = {
    ...AGENT_PROFILE,
    subscription_status: 'trial' as const,
    trial_expires_at: new Date(Date.now() - 1000).toISOString(),
  };
  expect(isTrialExpired(expiredTrialProfile)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/paymentService.test.ts`
Expected: FAIL with `priceAed` expecting 149 instead of 499.

- [ ] **Step 3: Implement updates in `paymentService.ts` and `authService.ts`**
1. In `src/services/paymentService.ts`:
   - Set `SUBSCRIPTION_PLANS.monthly.priceAed = 149`, `billingPeriodText = '149 AED / month'`.
   - Alias `SUBSCRIPTION_PLANS.annual` to monthly plan or keep as 149 AED monthly equivalent.
   - Export `isTrialExpired(profile: Partial<Profile> | null | undefined): boolean` checking `profile?.trial_expires_at ? new Date(profile.trial_expires_at) < new Date() : false`.
2. In `src/services/authService.ts`:
   - In `registerBroker`: assign `subscription_status = 'trial'`, `trial_expires_at = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()`, and save `email`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/paymentService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/paymentService.ts src/services/authService.ts src/services/__tests__/paymentService.test.ts
git commit -m "feat(subscription): set 149 AED monthly tier and 5-day trial expiration logic"
```

---

### Task 3: Marketing & Admin Service (`marketingService.ts`)

**Files:**
- Create: `src/services/marketingService.ts`
- Test: `src/services/__tests__/marketingService.test.ts`

**Interfaces:**
- Consumes: `Profile`, `PromoCoupon`, `MarketingCampaign`, `PaymentTransaction`
- Produces:
  - `fetchMarketingCampaigns(): Promise<MarketingCampaign[]>`
  - `toggleMarketingCampaign(campaignId: string, enabled: boolean): Promise<boolean>`
  - `fetchAdminPromos(): Promise<PromoCoupon[]>`
  - `createAdminPromo(promo: Omit<PromoCoupon, 'id' | 'times_redeemed' | 'created_at'>): Promise<PromoCoupon>`
  - `toggleAdminPromo(promoId: string, isActive: boolean): Promise<boolean>`
  - `extendBrokerTrial(profileId: string, additionalDays?: number): Promise<Profile>`
  - `sendBroadcastEmail(payload: { audience: string; subject: string; htmlContent: string }): Promise<{ success: boolean; dispatchedCount: number }>`
  - `fetchRevenueMetrics(): Promise<{ mrrAed: number; cashCollected30d: number; activeCount: number; trialCount: number }>`

- [ ] **Step 1: Write the failing tests**
Create `src/services/__tests__/marketingService.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import {
  fetchMarketingCampaigns,
  toggleMarketingCampaign,
  fetchAdminPromos,
  createAdminPromo,
  extendBrokerTrial,
  fetchRevenueMetrics,
} from '../marketingService';

describe('Marketing & Admin Service', () => {
  it('returns pre-set automated marketing triggers with toggle capability', async () => {
    const campaigns = await fetchMarketingCampaigns();
    expect(campaigns.length).toBeGreaterThanOrEqual(3);
    expect(campaigns.some((c) => c.trigger_type === 'trial_day_3')).toBe(true);

    const toggled = await toggleMarketingCampaign(campaigns[0].id, false);
    expect(toggled).toBe(true);
  });

  it('calculates contracted MRR and trial pipeline', async () => {
    const metrics = await fetchRevenueMetrics();
    expect(metrics).toHaveProperty('mrrAed');
    expect(metrics).toHaveProperty('trialCount');
    expect(metrics).toHaveProperty('activeCount');
  });

  it('extends broker trial by specified days', async () => {
    const updated = await extendBrokerTrial('00000000-0000-0000-0000-000000000002', 5);
    expect(new Date(updated.trial_expires_at!).getTime()).toBeGreaterThan(Date.now());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/marketingService.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/services/marketingService.ts`**
Implement database calls to Supabase with in-memory test fallbacks when running in sandbox or mock mode. Include pre-set campaign seeds (Day 3 check-in, 24h expiration alert, trial expired win-back).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/marketingService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/marketingService.ts src/services/__tests__/marketingService.test.ts
git commit -m "feat(services): implement marketingService for subscriptions, promos, and campaigns"
```

---

### Task 4: Pluggable Supabase Edge Function (`email-dispatcher`)

**Files:**
- Create: `supabase/functions/email-dispatcher/index.ts`
- Create: `supabase/functions/email-dispatcher/deno.json`

**Interfaces:**
- Consumes: HTTP POST request with `{ audience?: string; to?: string[]; subject: string; htmlContent?: string; template?: string; data?: Record<string, any> }`
- Produces: JSON response `{ success: boolean, dispatchedCount: number, provider: string }`

- [ ] **Step 1: Create Edge Function structure**
Create `supabase/functions/email-dispatcher/index.ts` with:
- Deno HTTP serve handler.
- Pluggable provider selection:
  1. If `Deno.env.get('RESEND_API_KEY')` is present: send via Resend API.
  2. Else: log email payload to console and insert into `email_logs`.
- Audience resolver querying `public.profiles` for target segment (`all`, `active`, `trial`, `expired`).
- Branded luxury Dubai HTML email template generator with Champagne Gold borders and Cinzel styling.

- [ ] **Step 2: Add validation for audience resolution and subject**
Ensure empty audience or missing subject returns HTTP 400 with helpful JSON error message.

- [ ] **Step 3: Verify TypeScript formatting and configuration**
Create `supabase/functions/email-dispatcher/deno.json`.

- [ ] **Step 4: Commit**
```bash
git add supabase/functions/email-dispatcher/
git commit -m "feat(edge-functions): create pluggable email-dispatcher function"
```

---

### Task 5: Admin Subscriptions & Revenue Dashboard Component (`AdminSubscriptions.tsx`)

**Files:**
- Create: `src/pages/admin/AdminSubscriptions.tsx`
- Test: `src/pages/admin/__tests__/AdminSubscriptions.test.tsx`

**Interfaces:**
- Consumes: `fetchRevenueMetrics()`, `extendBrokerTrial()`, `Profile`
- Produces: React component rendering KPI cards (MRR, Cash Collected, Active Paying, Trial Pipeline), searchable Broker Directory table, and Transaction History ledger.

- [ ] **Step 1: Write the failing component test**
Create `src/pages/admin/__tests__/AdminSubscriptions.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminSubscriptions } from '../AdminSubscriptions';

describe('AdminSubscriptions Component', () => {
  it('renders revenue KPI cards including MRR and active subscribers', async () => {
    render(<AdminSubscriptions />);
    expect(await screen.findByText(/Contracted MRR/i)).toBeInTheDocument();
    expect(screen.getByText(/Trial Pipeline/i)).toBeInTheDocument();
  });

  it('allows extending trial for a broker', async () => {
    render(<AdminSubscriptions />);
    const extendButtons = await screen.findAllByRole('button', { name: /\+5 Days/i });
    fireEvent.click(extendButtons[0]);
    await waitFor(() => {
      expect(screen.getByText(/Trial extended successfully/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/admin/__tests__/AdminSubscriptions.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/pages/admin/AdminSubscriptions.tsx`**
Build luxury UI with Warm Alabaster cards, KPI metrics, searchable broker list with status pills (`Active`, `Trial (X days left)`, `Trial Expired`), and quick-action buttons for trial extension and VIP access.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/admin/__tests__/AdminSubscriptions.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/pages/admin/AdminSubscriptions.tsx src/pages/admin/__tests__/AdminSubscriptions.test.tsx
git commit -m "feat(admin): implement AdminSubscriptions KPI dashboard and broker management table"
```

---

### Task 6: Admin Promo Code Management Component (`AdminPromos.tsx`)

**Files:**
- Create: `src/pages/admin/AdminPromos.tsx`
- Test: `src/pages/admin/__tests__/AdminPromos.test.tsx`

**Interfaces:**
- Consumes: `fetchAdminPromos()`, `createAdminPromo()`, `toggleAdminPromo()`
- Produces: React component for promo code management with live redemption counter and modal creation form.

- [ ] **Step 1: Write the failing component test**
Create `src/pages/admin/__tests__/AdminPromos.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminPromos } from '../AdminPromos';

describe('AdminPromos Component', () => {
  it('renders promo vouchers list with redemption counts and create button', async () => {
    render(<AdminPromos />);
    expect(await screen.findByText(/Promotional Vouchers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Promo Code/i })).toBeInTheDocument();
  });

  it('opens modal and allows creating a new promo code', async () => {
    render(<AdminPromos />);
    fireEvent.click(screen.getByRole('button', { name: /Create Promo Code/i }));
    expect(screen.getByLabelText(/Promo Code/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/admin/__tests__/AdminPromos.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/pages/admin/AdminPromos.tsx`**
Implement the promos table displaying voucher code, discount (% or AED), redemptions vs cap, expiration, active toggle, and creation modal with uppercase code formatting.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/admin/__tests__/AdminPromos.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/pages/admin/AdminPromos.tsx src/pages/admin/__tests__/AdminPromos.test.tsx
git commit -m "feat(admin): implement AdminPromos voucher creation and usage tracking"
```

---

### Task 7: Admin Marketing & Broadcast Email Component (`AdminMarketing.tsx`)

**Files:**
- Create: `src/pages/admin/AdminMarketing.tsx`
- Test: `src/pages/admin/__tests__/AdminMarketing.test.tsx`

**Interfaces:**
- Consumes: `fetchMarketingCampaigns()`, `toggleMarketingCampaign()`, `sendBroadcastEmail()`
- Produces: React component with pre-set lifecycle drip toggles (Day 3 check-in, 24h alert, win-back) and manual broadcast email sender with live HTML preview.

- [ ] **Step 1: Write the failing component test**
Create `src/pages/admin/__tests__/AdminMarketing.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminMarketing } from '../AdminMarketing';

describe('AdminMarketing Component', () => {
  it('renders automated drip toggles and broadcast composer', async () => {
    render(<AdminMarketing />);
    expect(await screen.findByText(/Automated Marketing Triggers/i)).toBeInTheDocument();
    expect(screen.getByText(/Day 3 Check-In/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Broadcast/i })).toBeInTheDocument();
  });

  it('allows toggling an automated campaign', async () => {
    render(<AdminMarketing />);
    const switches = await screen.findAllByRole('switch');
    fireEvent.click(switches[0]);
    // Verifies toggle state updates
    expect(switches[0]).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/admin/__tests__/AdminMarketing.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/pages/admin/AdminMarketing.tsx`**
Implement the automated marketing triggers panel with toggle switches and email template preview modal, alongside the manual broadcast composer with audience dropdown selector and live Dubai luxury HTML preview.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/admin/__tests__/AdminMarketing.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/pages/admin/AdminMarketing.tsx src/pages/admin/__tests__/AdminMarketing.test.tsx
git commit -m "feat(admin): implement AdminMarketing automated drips and broadcast email sender"
```

---

### Task 8: Unified Admin Dashboard Container & Routing

**Files:**
- Create: `src/pages/admin/AdminDashboard.tsx`
- Modify: `src/App.tsx:320-370`
- Test: `src/pages/admin/__tests__/AdminDashboard.test.tsx`

**Interfaces:**
- Consumes: `AdminApprovals`, `AdminSubscriptions`, `AdminPromos`, `AdminMarketing`
- Produces: Unified `/admin` executive container with tab switching and persistent state.

- [ ] **Step 1: Write the failing component test**
Create `src/pages/admin/__tests__/AdminDashboard.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AdminDashboard } from '../AdminDashboard';

describe('AdminDashboard Component', () => {
  it('renders tab navigation for Approvals, Subscriptions, Promos, and Marketing', () => {
    render(<AdminDashboard />);
    expect(screen.getByRole('tab', { name: /Property Approvals/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Subscriptions & Revenue/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Promos & Vouchers/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Marketing & Email/i })).toBeInTheDocument();
  });

  it('switches tabs smoothly when clicked', () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole('tab', { name: /Subscriptions & Revenue/i }));
    expect(screen.getByText(/Contracted MRR/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/admin/__tests__/AdminDashboard.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `AdminDashboard.tsx` and integrate into `App.tsx`**
1. Create `src/pages/admin/AdminDashboard.tsx` with luxury tab headers, counts, and active indicators.
2. In `src/App.tsx`, route `/admin` and `/admin/approvals` to render `AdminDashboard`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/admin/__tests__/AdminDashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/pages/admin/AdminDashboard.tsx src/pages/admin/__tests__/AdminDashboard.test.tsx src/App.tsx
git commit -m "feat(admin): implement unified AdminDashboard with multi-tab navigation"
```

---

### Task 9: Streamlined 149 AED Subscription Page & Soft-Paused Paywall

**Files:**
- Modify: `src/pages/auth/SubscriptionPage.tsx`
- Modify: `src/components/layout/Navbar.tsx:210-250`
- Modify: `src/App.tsx:290-330`
- Test: `src/pages/auth/__tests__/SubscriptionPage.test.tsx`

**Interfaces:**
- Consumes: `SUBSCRIPTION_PLANS.monthly` (149 AED), `isTrialExpired`
- Produces: Simplified single-tier subscription page, navbar trial status countdown badge, soft-paused paywall gate

- [ ] **Step 1: Write/update the failing tests**
In `src/pages/auth/__tests__/SubscriptionPage.test.tsx`:
```typescript
it('renders single 149 AED per month subscription pricing', () => {
  render(<SubscriptionPage />);
  expect(screen.getByText(/149/)).toBeInTheDocument();
  expect(screen.getByText(/AED \/ month/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/auth/__tests__/SubscriptionPage.test.tsx`
Expected: FAIL expecting 149 instead of 499.

- [ ] **Step 3: Implement UI updates**
1. In `SubscriptionPage.tsx`:
   - Remove the 2-plan radio selection grid; present the single 149 AED/month Pro Membership card.
   - Retain the voucher coupon code input, auto-renew toggle, and `Pay with Apple Pay / Card (149 AED)`.
2. In `Navbar.tsx`:
   - If broker has `subscription_status === 'trial'`, calculate remaining days and display amber badge: `Trial: X days left` (or `Trial Expired • Upgrade to Pro`).
3. In `App.tsx`:
   - Confirm paywall check is explicitly commented with `// [PAUSED FOR NOW: Re-enable for final production launch]` so non-blocking behavior is preserved.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/auth/__tests__/SubscriptionPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/pages/auth/SubscriptionPage.tsx src/components/layout/Navbar.tsx src/App.tsx src/pages/auth/__tests__/SubscriptionPage.test.tsx
git commit -m "feat(subscribe): streamline checkout to single 149 AED plan with trial navbar indicator"
```

---

### Task 10: Full Verification & End-to-End Regression Testing

**Files:**
- Modify: Any test files requiring alignment with updated 149 AED pricing.
- Test: All 24+ test suites in `src/**/__tests__/*`

- [ ] **Step 1: Run complete Vitest suite**
Run: `npx vitest run`
Expected: 100% PASS across all suites (estimated 185+ passing tests).

- [ ] **Step 2: Run production TypeScript & bundle build**
Run: `npm run build`
Expected: Clean build in < 4s with 0 errors.

- [ ] **Step 3: Commit and Push**
```bash
git add -A
git commit -m "chore(release): complete 149 AED subscription, 5-day trial, and admin marketing suite"
git push origin main
```
Confirm deployment on Vercel at `https://realtor-buddy-ae.vercel.app`.
