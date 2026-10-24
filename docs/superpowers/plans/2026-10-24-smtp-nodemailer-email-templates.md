# Nodemailer SMTP Integration, Email OTP Verification & 8 Luxury Email Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a direct Nodemailer SMTP delivery engine into Realtor Buddy's Supabase Edge Function to bypass native email caps, enforce a pre-registration 6-digit Email OTP verification gate for onboarding brokers, and deliver a responsive 8-template luxury Dubai email suite.

**Architecture:** Upgrade `supabase/functions/email-dispatcher` with Deno `npm:nodemailer` support using environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`) with route-level access control. Introduce a `broker_otps` table and `profiles.email_verified` migration. Implement the full 8 responsive Obsidian & Gold HTML templates. Add an Obsidian & Gold 6-digit OTP verification modal in `AuthPage.tsx` gating broker registration, and wire transactional triggers for Welcome, Payment Receipt, and Property Status notifications.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Supabase (PostgreSQL, RLS, Edge Functions under Deno runtime), Nodemailer (`npm:nodemailer@^6.9.16`), Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-24-smtp-nodemailer-email-templates-design.md](file:///Users/Monil_149/Documents/Realtor%20Buddy/docs/superpowers/specs/2026-10-24-smtp-nodemailer-email-templates-design.md)

## Global Constraints
- Single subscription tier is 149 AED / month (`SUBSCRIPTION_PLANS.monthly`).
- New brokers receive `subscription_status = 'trial'` with exactly 5-day expiration (`trial_expires_at = now() + 5 days`).
- Email OTP codes are strictly 6 numeric digits, valid for 10 minutes (`expires_at = now() + 10 mins`), max 3 requests/hour per email, and max 5 attempts before invalidation.
- Brokers must verify their 6-digit OTP before their account is activated or credentials confirmed.
- Mass broadcast (`action: 'send_email'`) requires authenticated Supabase admin JWT; `send_otp` and `verify_otp` remain public.
- All email templates must render responsive Obsidian Noir (`#090D15`) backgrounds, Champagne Gold (`#D4AF37`) headings/buttons, Cinzel serif typography, and inline CSS formatting.
- Vitest pass rate must remain at 100% with clean `npm run build`.

## Review Focus
1. **OTP Rate Limiting & Expiry:** Attempting more than 3 OTP requests within an hour or submitting an OTP after 10 minutes must return an explicit error and reject verification.
2. **Brute-Force OTP Protection:** Submitting 5 incorrect OTP codes consecutively must invalidate the OTP session and require requesting a new code.
3. **Registration Gating:** Submitting the registration form must NOT log the user in or activate the account until `verify_otp` succeeds.
4. **Offline / Sandbox SMTP Fallback:** When `SMTP_USER` or `SMTP_PASS` are unset, `email-dispatcher` must gracefully fall back to logging in `email_logs` and return a mock success code without throwing unhandled exceptions.
5. **Template Interpolation Safety:** Missing template variables in data payloads must not render unparsed `{{key}}` tokens or crash the dispatcher.

---

### Task 1: Database Migration for `broker_otps` & `profiles.email_verified`

**Files:**
- Create: `supabase/migrations/20261024040000_broker_otps.sql`
- Modify: `src/types/index.ts:30-80`
- Test: `src/types/__tests__/otpTypes.test.ts`

**Interfaces:**
- Consumes: Existing `Profile` interface from `src/types/index.ts`
- Produces: Updated `Profile` (with `email_verified?: boolean`), and `BrokerOtp` interface:
  ```typescript
  export interface BrokerOtp {
    id: string;
    email: string;
    otp_code: string;
    purpose: 'verification' | 'password_reset' | 'login';
    attempts: number;
    max_attempts: number;
    expires_at: string;
    consumed_at: string | null;
    created_at: string;
  }
  ```

- [ ] **Step 1: Write the failing type test**
Create `src/types/__tests__/otpTypes.test.ts` validating that `Profile` accepts `email_verified` and that `BrokerOtp` matches required properties:
```typescript
import { describe, it, expect } from 'vitest';
import type { Profile, BrokerOtp } from '../index';

describe('Broker OTP and Profile Types', () => {
  it('supports email_verified on Profile interface', () => {
    const profile: Profile = {
      id: 'broker-123',
      full_name: 'Zaid Al-Harbi',
      agency_name: 'Emaar Signature',
      phone_number: '+971501234567',
      whatsapp_number: '+971501234567',
      email: 'zaid@emaar.ae',
      role: 'agent',
      status: 'active',
      subscription_status: 'trial',
      email_verified: true,
      trial_expires_at: '2026-10-29T12:00:00.000Z',
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(profile.email_verified).toBe(true);
  });

  it('validates BrokerOtp interface attributes', () => {
    const otpRecord: BrokerOtp = {
      id: 'otp-uuid-1',
      email: 'zaid@emaar.ae',
      otp_code: '492817',
      purpose: 'verification',
      attempts: 0,
      max_attempts: 5,
      expires_at: '2026-10-24T12:10:00.000Z',
      consumed_at: null,
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(otpRecord.otp_code).toBe('492817');
    expect(otpRecord.max_attempts).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/types/__tests__/otpTypes.test.ts`
Expected: FAIL due to missing `BrokerOtp` or `email_verified` on `Profile`.

- [ ] **Step 3: Update `src/types/index.ts` and create migration**
1. In `src/types/index.ts`:
   - Add `email_verified?: boolean;` to `Profile`.
   - Export `BrokerOtp` interface.
2. In `supabase/migrations/20261024040000_broker_otps.sql`:
   - Add `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;`
   - Create `public.broker_otps` table with RLS policies and index on `(email, purpose, created_at DESC)`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/types/__tests__/otpTypes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/types/index.ts src/types/__tests__/otpTypes.test.ts supabase/migrations/20261024040000_broker_otps.sql
git commit -m "feat(types,db): add broker_otps table schema and email_verified profile column"
```

---

### Task 2: Nodemailer SMTP Delivery Engine & 8 Luxury HTML Email Templates

**Files:**
- Modify: `supabase/functions/email-dispatcher/index.ts`
- Create: `src/services/__tests__/emailDispatcherTemplates.test.ts`

**Interfaces:**
- Consumes: `EmailDispatcherPayload` from `supabase/functions/email-dispatcher/index.ts`
- Produces: `generateLuxuryEmailHtml(params)` supporting all 8 template identifiers:
  `otp_verification`, `broker_welcome_trial`, `trial_day_3`, `trial_expiring_24h`, `trial_expired_winback`, `payment_receipt`, `property_review_status`, `admin_broadcast`.

- [ ] **Step 1: Write the failing template unit tests**
Create `src/services/__tests__/emailDispatcherTemplates.test.ts` checking template output:
```typescript
import { describe, it, expect } from 'vitest';
import { generateLuxuryEmailHtml } from '../../../supabase/functions/email-dispatcher/index';

describe('Luxury Email Templates Suite', () => {
  it('renders otp_verification template with highlighted 6-digit code', () => {
    const html = generateLuxuryEmailHtml({
      subject: 'Your Verification Code',
      template: 'otp_verification',
      data: { code: '849201', expiry_minutes: 10 },
    });
    expect(html).toContain('849201');
    expect(html).toContain('REALTOR BUDDY');
    expect(html).toContain('#D4AF37');
    expect(html).toContain('10 minutes');
  });

  it('renders broker_welcome_trial with 5-day trial details', () => {
    const html = generateLuxuryEmailHtml({
      subject: 'Welcome to Realtor Buddy VIP',
      template: 'broker_welcome_trial',
      data: { broker_name: 'Tariq Al-Mansoor', trial_days: 5 },
    });
    expect(html).toContain('Tariq Al-Mansoor');
    expect(html).toContain('5-Day Complimentary Trial');
    expect(html).toContain('EXPLORE OFF-PLAN INVENTORY');
  });

  it('renders payment_receipt with 149 AED and invoice reference', () => {
    const html = generateLuxuryEmailHtml({
      subject: 'Payment Confirmation & Receipt',
      template: 'payment_receipt',
      data: { invoice_id: 'INV-2026-904', amount_aed: 149, broker_name: 'Elena Rostova' },
    });
    expect(html).toContain('INV-2026-904');
    expect(html).toContain('149 AED');
    expect(html).toContain('Elena Rostova');
  });

  it('renders property_review_status with approval status and feedback', () => {
    const html = generateLuxuryEmailHtml({
      subject: 'Listing Approved',
      template: 'property_review_status',
      data: { property_title: 'Habtoor Grand Residences', status: 'approved' },
    });
    expect(html).toContain('Habtoor Grand Residences');
    expect(html).toContain('approved');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/emailDispatcherTemplates.test.ts`
Expected: FAIL due to missing template handlers in `generateLuxuryEmailHtml`.

- [ ] **Step 3: Implement Nodemailer Transporter and 8 Luxury Templates in `email-dispatcher`**
1. In `supabase/functions/email-dispatcher/index.ts`:
   - Import `nodemailer from "npm:nodemailer@^6.9.16"`.
   - Update `generateLuxuryEmailHtml` to implement all 8 templates with Cinzel/Inter typography, `#090D15` background, `#D4AF37` hairline borders, and variable substitution.
   - Replace Resend logic with Nodemailer SMTP transporter:
     ```typescript
     const smtpHost = Deno.env.get('SMTP_HOST');
     const smtpPort = Number(Deno.env.get('SMTP_PORT') || 587);
     const smtpSecure = Deno.env.get('SMTP_SECURE') === 'true' || smtpPort === 465;
     const smtpUser = Deno.env.get('SMTP_USER');
     const smtpPass = Deno.env.get('SMTP_PASS');
     const smtpFrom = Deno.env.get('SMTP_FROM') || '"Realtor Buddy VIP Concierge" <concierge@realtorbuddy.ae>';
     ```
   - When SMTP variables are configured, create transporter and dispatch; if not configured, fall back to logger and log to `email_logs`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/emailDispatcherTemplates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add supabase/functions/email-dispatcher/index.ts src/services/__tests__/emailDispatcherTemplates.test.ts
git commit -m "feat(edge-functions): integrate nodemailer smtp transporter and 8 luxury email templates"
```

---

### Task 3: OTP Generation, Verification & Edge Function Route Authorization

**Files:**
- Modify: `supabase/functions/email-dispatcher/index.ts`
- Create: `src/services/__tests__/otpDispatcher.test.ts`

**Interfaces:**
- Consumes: `broker_otps` table, `handleEmailDispatcherRequest`
- Produces:
  - `action: 'send_otp'` endpoint (public, generates 6-digit OTP, stores in DB, sends email)
  - `action: 'verify_otp'` endpoint (public, verifies code, updates `consumed_at` and `profiles.email_verified`)
  - Route guard enforcing admin JWT for `action: 'send_email'` / batch broadcast.

- [ ] **Step 1: Write the failing tests**
Create `src/services/__tests__/otpDispatcher.test.ts` testing OTP generation, validation logic, and authorization guards:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleEmailDispatcherRequest } from '../../../supabase/functions/email-dispatcher/index';

describe('OTP Generation & Verification Actions', () => {
  it('handles send_otp request and returns success status', async () => {
    const req = new Request('https://edge.realtorbuddy.ae/email-dispatcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_otp',
        email: 'newbroker@apexrealty.ae',
      }),
    });
    const res = await handleEmailDispatcherRequest(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.action).toBe('send_otp');
  });

  it('rejects verify_otp when code is invalid or missing', async () => {
    const req = new Request('https://edge.realtorbuddy.ae/email-dispatcher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_otp',
        email: 'newbroker@apexrealty.ae',
        otp_code: '000000',
      }),
    });
    const res = await handleEmailDispatcherRequest(req);
    const body = await res.json();
    expect(body.verified).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/otpDispatcher.test.ts`
Expected: FAIL due to missing `action: 'send_otp'` handler.

- [ ] **Step 3: Implement `send_otp` and `verify_otp` in `email-dispatcher`**
1. In `supabase/functions/email-dispatcher/index.ts`:
   - Inspect `payload.action`.
   - If `action === 'send_otp'`:
     - Validate email format.
     - Check rate limit (query `broker_otps` count where `created_at > now() - 1 hour`). If `>= 3`, return HTTP 429.
     - Generate random 6-digit numeric string (`Math.floor(100000 + Math.random() * 900000).toString()`).
     - Insert into `broker_otps` with `expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()`.
     - Send `otp_verification` email via Nodemailer.
     - Return `{ success: true, action: 'send_otp' }`.
   - If `action === 'verify_otp'`:
     - Query latest `broker_otps` row where `email = payload.email` and `consumed_at IS NULL` and `expires_at > now()`.
     - Check `attempts >= max_attempts`: if so, return `{ success: false, verified: false, error: 'Maximum attempts exceeded. Request a new code.' }`.
     - If code matches: update `consumed_at = now()`, update `profiles.email_verified = true`, return `{ success: true, verified: true }`.
     - If code does not match: increment `attempts` by 1 and return `{ success: false, verified: false, error: 'Invalid verification code' }`.
   - If `action === 'send_email'` or broadcast: check `req.headers.get('authorization')` for admin authorization before dispatching mass mail.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/otpDispatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add supabase/functions/email-dispatcher/index.ts src/services/__tests__/otpDispatcher.test.ts
git commit -m "feat(edge-functions): implement send_otp, verify_otp, and admin route protection"
```

---

### Task 4: Frontend Services Integration for OTP & Transactional Triggers

**Files:**
- Modify: `src/services/authService.ts`
- Modify: `src/services/paymentService.ts`
- Modify: `src/services/propertyService.ts`
- Modify: `src/services/marketingService.ts`
- Create: `src/services/__tests__/authServiceOtp.test.ts`

**Interfaces:**
- Consumes: `email-dispatcher` edge function
- Produces:
  - `sendEmailOtp(email: string): Promise<{ success: boolean; error?: string }>`
  - `verifyEmailOtp(email: string, code: string): Promise<{ success: boolean; verified: boolean; error?: string }>`
  - Updated `registerBroker(payload)` accepting `otpVerified: boolean`.
  - Transactional email dispatchers in `paymentService` and `propertyService`.

- [ ] **Step 1: Write the failing tests**
Create `src/services/__tests__/authServiceOtp.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendEmailOtp, verifyEmailOtp, registerBroker } from '../authService';

describe('authService OTP and Registration Integration', () => {
  it('exposes sendEmailOtp function and returns a boolean status', async () => {
    const res = await sendEmailOtp('broker.test@apexrealty.ae');
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });

  it('exposes verifyEmailOtp and validates code', async () => {
    const res = await verifyEmailOtp('broker.test@apexrealty.ae', '123456');
    expect(res).toBeDefined();
    expect(typeof res.verified).toBe('boolean');
  });

  it('rejects registration when email is not verified', async () => {
    const res = await registerBroker({
      fullName: 'Rashid Al-Falasi',
      agencyName: 'Gulf Luxury',
      email: 'rashid@gulfluxury.ae',
      whatsappNumber: '+971501112233',
      otpVerified: false,
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Email verification required');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/services/__tests__/authServiceOtp.test.ts`
Expected: FAIL due to missing `sendEmailOtp` / `verifyEmailOtp`.

- [ ] **Step 3: Implement OTP helpers and transactional triggers in services**
1. In `src/services/authService.ts`:
   - Implement `sendEmailOtp` invoking Edge function with `{ action: 'send_otp', email }`. In offline/mock mode, simulate success with a console token.
   - Implement `verifyEmailOtp` invoking Edge function with `{ action: 'verify_otp', email, otp_code: code }`.
   - Update `RegisterBrokerPayload` to include `otpVerified?: boolean`. In `registerBroker`, enforce `if (!payload.otpVerified) return { success: false, error: 'Email verification required' };`.
   - Upon successful registration, trigger `broker_welcome_trial` email.
2. In `src/services/paymentService.ts`:
   - In `verifyPaymentTransaction`, when status is `'paid'`, trigger `payment_receipt` email with `invoice_id`, `amount_aed: 149`, and broker details.
3. In `src/services/propertyService.ts`:
   - When admin updates listing status to `'approved'` or `'rejected'`, trigger `property_review_status` email to broker.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/services/__tests__/authServiceOtp.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/authService.ts src/services/paymentService.ts src/services/propertyService.ts src/services/marketingService.ts src/services/__tests__/authServiceOtp.test.ts
git commit -m "feat(services): implement sendEmailOtp, verifyEmailOtp, and transactional email triggers"
```

---

### Task 5: Pre-Registration 6-Digit OTP Modal & Registration Gating UI

**Files:**
- Create: `src/components/auth/OtpVerificationModal.tsx`
- Modify: `src/pages/auth/AuthPage.tsx`
- Create: `src/pages/auth/__tests__/OtpVerificationModal.test.tsx`

**Interfaces:**
- Consumes: `sendEmailOtp`, `verifyEmailOtp` from `src/services/authService.ts`
- Produces: `OtpVerificationModal` component with 6 numeric code inputs, resend timer (60s cooldown), and submit verification button.

- [ ] **Step 1: Write the failing modal tests**
Create `src/pages/auth/__tests__/OtpVerificationModal.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OtpVerificationModal } from '../../../components/auth/OtpVerificationModal';

describe('OtpVerificationModal Component', () => {
  it('renders modal with email address and 6 input slots', () => {
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/broker@skyline.ae/i)).toBeInTheDocument();
    expect(screen.getByText(/Verification Code/i)).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBe(6);
  });

  it('disables resend button initially during 60-second cooldown', () => {
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onChangeEmail={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const resendBtn = screen.getByRole('button', { name: /resend/i });
    expect(resendBtn).toBeDisabled();
    expect(resendBtn.textContent).toMatch(/0:|59|60/);
  });

  it('allows switching into email editing mode when Change Email is clicked', () => {
    const handleChangeEmail = vi.fn();
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onChangeEmail={handleChangeEmail}
        onClose={vi.fn()}
      />
    );
    const changeEmailBtn = screen.getByRole('button', { name: /change email/i });
    fireEvent.click(changeEmailBtn);
    const newEmailInput = screen.getByPlaceholderText(/enter new email/i);
    expect(newEmailInput).toBeInTheDocument();
    fireEvent.change(newEmailInput, { target: { value: 'corrected@skyline.ae' } });
    const updateBtn = screen.getByRole('button', { name: /update & send otp/i });
    fireEvent.click(updateBtn);
    expect(handleChangeEmail).toHaveBeenCalledWith('corrected@skyline.ae');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/auth/__tests__/OtpVerificationModal.test.tsx`
Expected: FAIL due to missing component.

- [ ] **Step 3: Implement `OtpVerificationModal` and wire into `AuthPage.tsx`**
1. In `src/components/auth/OtpVerificationModal.tsx`:
   - Design luxury Obsidian Noir (`#090D15`) backdrop with Champagne Gold border (`border-[#D4AF37]/50`).
   - 6 auto-advancing single-character input boxes with paste support (splitting 6 digits across inputs).
   - Display masked broker email and countdown timer (`Expires in 10:00`).
   - Strict 60-second cooldown timer disabling "Resend OTP" button (`Resend in 0:59...`) until expired.
   - "Change Email" action toggling an inline email edit input, updating the active address and requesting a new OTP without leaving the modal.
   - Verification error message alert box.
2. In `src/pages/auth/AuthPage.tsx`:
   - When broker submits registration form, prevent immediate account creation.
   - Trigger `sendEmailOtp(email)` and set `showOtpModal(true)`.
   - Provide `onChangeEmail` handler that updates the form's `email` field and sends a fresh OTP.
   - When OTP is verified successfully in modal, invoke `registerBroker({ ...formData, otpVerified: true })`.
   - On completion, show success banner and navigate to app.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/auth/__tests__/OtpVerificationModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/components/auth/OtpVerificationModal.tsx src/pages/auth/AuthPage.tsx src/pages/auth/__tests__/OtpVerificationModal.test.tsx
git commit -m "feat(auth): implement luxury 6-digit OTP verification modal and registration gate"
```

---

### Task 6: Admin Marketing 8-Template Showcase & Live Test Sender

**Files:**
- Modify: `src/pages/admin/AdminMarketing.tsx`
- Create: `src/pages/admin/__tests__/AdminMarketingTemplates.test.tsx`

**Interfaces:**
- Consumes: 8 template definitions from `email-dispatcher` / `marketingService.ts`
- Produces: Template browser with luxury desktop/mobile visual preview and "Send Test Email" modal.

- [ ] **Step 1: Write the failing admin marketing test**
Create `src/pages/admin/__tests__/AdminMarketingTemplates.test.tsx`:
```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminMarketing } from '../AdminMarketing';

describe('AdminMarketing 8-Template Previewer', () => {
  it('displays all 8 templates in template library dropdown or tabs', () => {
    render(<AdminMarketing />);
    expect(screen.getByText(/OTP Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Broker Welcome & VIP Trial/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Receipt/i)).toBeInTheDocument();
  });

  it('allows triggering a test email dispatch', async () => {
    render(<AdminMarketing />);
    const testBtn = screen.getByRole('button', { name: /send test email/i });
    expect(testBtn).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run src/pages/admin/__tests__/AdminMarketingTemplates.test.tsx`
Expected: FAIL due to missing template options.

- [ ] **Step 3: Update `AdminMarketing.tsx` with Template Showcase and Test Sender**
1. Add template definitions catalog for all 8 templates with sample data.
2. In the template preview modal:
   - Render luxury Obsidian & Gold preview card with toggle for Mobile/Desktop viewport.
   - Add "Send Test Email to Me" input and button, invoking `sendBroadcastEmail({ to: [testEmail], template: selectedTemplate, subject: ... })`.
3. Display active SMTP configuration status indicator (e.g. `SMTP Engine: Nodemailer (Hostinger/Gmail)`).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run src/pages/admin/__tests__/AdminMarketingTemplates.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/pages/admin/AdminMarketing.tsx src/pages/admin/__tests__/AdminMarketingTemplates.test.tsx
git commit -m "feat(admin): add 8-template luxury previewer and test email dispatcher in AdminMarketing"
```

---

### Task 7: Full System Verification, Vitest Suite & Build

**Files:**
- Verify: Full codebase
- Commands: `npm test`, `npm run build`

- [ ] **Step 1: Run complete Vitest suite**
Run: `npm test`
Expected: 100% pass rate across all test suites (existing 173 tests + all new test suites).

- [ ] **Step 2: Run TypeScript build**
Run: `npm run build`
Expected: Clean build with zero TypeScript errors and successful Vite output in `dist/`.

- [ ] **Step 3: Commit and verify git status**
```bash
git status
```
Expected: Clean working tree on `main`.
