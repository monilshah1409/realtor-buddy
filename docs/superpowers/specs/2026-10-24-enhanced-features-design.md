# Design Document: Realtor Buddy Enhanced Features

**Date:** 2026-10-24  
**Status:** In Review (Pending Partner Approval)  
**Authors:** Antigravity Engineering & Product Partner  

---

## 1. Intent and Why

As Realtor Buddy matures into a commercial SaaS platform for Dubai real estate professionals, it requires advanced account governance, monetization accelerators, customer support channels, and seamless multi-device responsiveness:
1. **Monetization & Growth Accelerators:** To drive recurring revenue and platform adoption, the app requires recurring **auto-pay subscriptions**, broker-to-broker **referral tracking**, and promotional **coupon codes** (e.g., promotional discounts for launch or VIP brokerages).
2. **Account Security & Credential Protection:** In commercial real estate software, brokerages frequently share a single paid login across an entire office. Restricting logins to a strict **maximum of 3 active devices per account** with an interactive device management modal protects subscription revenue while remaining convenient for individual agents who use an office desktop, home laptop, and personal smartphone.
3. **Universal Support & Complaint Channel:** Agents and prospective buyers encountering issues or offering suggestions need an immediate, ubiquitous channel to submit feedback or complaints from any page (including login and unauthenticated buyer views) routed directly to `mswebdevelopments.uae@gmail.com`.
4. **Complete Mobile, Tablet & Desktop Responsiveness:** Real estate agents in Dubai are constantly in transit—viewing properties on smartphones while driving between Downtown and the Marina, reviewing listings on tablets at client meetings, and managing submissions on office desktops. Every interface must scale gracefully.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Strict 3-Device Concurrency Lock:**
  - Track active sessions per user with device name, browser, OS, and last active timestamp.
  - When an agent attempts a 4th login, display a blocked login screen listing the 3 existing devices with an interactive "Disconnect Device" button to free up a slot.
- **Autopay, Referral Codes & Coupon Codes:**
  - Autopay: Support recurring auto-renewal via the UAE payment gateway.
  - Coupon Codes: Real-time validation at checkout supporting percentage (e.g., 20% off) or fixed AED discounts (e.g., 100 AED off).
  - Referral Codes: Unique broker referral code generation and attribution tracking on new signups.
- **Universal Feedback / Complaint Modal:**
  - Accessible on every single view (including login and unauthenticated public buyer pages).
  - Collects: Topic (Bug, Feature Request, Listing Issue, Billing, General Feedback), Brief Description, and Contact Details (Name, Email, Phone/WhatsApp).
  - Submits to database and delivers to `mswebdevelopments.uae@gmail.com`.
- **Complete Responsive Design:**
  - Mobile (<768px): Touch-first navigation, bottom floating tab bar to toggle between `List View` and `Map View`, full-width modals and cards.
  - Tablet (768px–1024px): Adaptive side-by-side or collapsible drawers.
  - Desktop (>1024px): Full split-screen views with synchronized map and property lists.

### Non-Goals
- Native iOS/Android app store packaging (responsive web PWA format delivers instant browser access without app store review delays).
- Automatic hardware biometric fingerprinting (standard User-Agent and browser session signatures are sufficient).

### Anti-Goals
- **No Silent Device Logouts:** Never silently kick out an active session without user consent; require explicit manual selection of which device to disconnect.
- **No Hidden Support Forms:** The feedback button must be visible, recognizable, and non-blocking on all viewports without obscuring primary action buttons.
- **No Broken Layouts on Mobile Viewports:** Zero horizontal scrollbars or clipped interactive controls on narrow phone screens.

---

## 3. Data Models & Database Extensions

### 3.1 User Sessions Table (`user_sessions`)
- `id` (UUID, primary key)
- `user_id` (UUID, references `auth.users`, indexed)
- `session_token` (text, unique)
- `device_name` (text, e.g., "iPhone 15 Pro", "MacBook Pro", "Windows Desktop")
- `browser` (text, e.g., "Safari 17.4", "Chrome 122")
- `os` (text, e.g., "iOS 17", "macOS Sonoma", "Windows 11")
- `ip_address` (text, nullable)
- `last_active_at` (timestamp with time zone)
- `is_active` (boolean, default true)
- `created_at` (timestamp with time zone)

### 3.2 Coupons Table (`coupons`)
- `id` (UUID, primary key)
- `code` (text, unique, uppercase)
- `discount_type` (enum: `percentage`, `fixed_aed`)
- `discount_value` (numeric, e.g. 20 for 20% or 100 for 100 AED)
- `max_uses` (integer, nullable for unlimited)
- `used_count` (integer, default 0)
- `expires_at` (timestamp with time zone, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamp with time zone)

### 3.3 Referrals Table (`referrals`)
- `id` (UUID, primary key)
- `referrer_id` (UUID, references `auth.users`)
- `referee_id` (UUID, references `auth.users`, unique)
- `referral_code` (text)
- `status` (enum: `pending`, `completed`, `rewarded`)
- `reward_granted` (text, optional)
- `created_at` (timestamp with time zone)

### 3.4 Feedback & Complaints Table (`feedback_submissions`)
- `id` (UUID, primary key)
- `topic` (enum: `bug`, `feature_request`, `listing_complaint`, `billing`, `other`)
- `brief` (text)
- `contact_name` (text)
- `contact_email` (text)
- `contact_phone` (text, optional)
- `page_url` (text)
- `user_id` (UUID, nullable, references `auth.users` if authenticated)
- `recipient_email` (text, default `'mswebdevelopments.uae@gmail.com'`)
- `status` (enum: `received`, `under_review`, `resolved`)
- `created_at` (timestamp with time zone)

---

## 4. System Architecture & Detailed Flows

### 4.1 Device Limit & Concurrency Flow (Max 3 Devices)
1. When an agent signs in, the client sends device signature metadata (parsed from User-Agent: device model, browser, OS).
2. The session service checks active sessions count: `SELECT COUNT(*) FROM user_sessions WHERE user_id = $1 AND is_active = true`.
3. **If count < 3:** New session is inserted as `is_active = true`, login completes normally.
4. **If count >= 3 and current device is NOT one of the active sessions:**
   - Login is temporarily halted.
   - An interactive modal **"Device Limit Reached (3/3 Devices Active)"** is displayed.
   - Lists the 3 active devices with friendly titles (e.g. `MacBook Pro • Chrome • Active 5 mins ago`).
   - Agent clicks **"Disconnect Device"** on any listed device.
   - The selected session is set to `is_active = false`.
   - The new device session is immediately registered and the agent is transitioned to the dashboard.

### 4.2 Checkout Autopay, Coupons & Referrals Flow
1. On the `SubscriptionPage`, the agent selects Monthly or Annual Pro plan.
2. An **"Auto-Renew (Autopay)"** toggle is displayed and enabled by default ("Automatically renews at the end of billing cycle; cancel anytime").
3. **Coupon Code Input:**
   - Agent enters a code (e.g., `SPECIAL20` or `LAUNCH100`).
   - System validates against `coupons` table in real-time.
   - If valid, calculates discounted price in AED and displays savings banner (e.g., `Original: 499 AED → Discounted: 399.20 AED`).
4. **Referral Code Input:**
   - Agent enters an optional broker referral code (or auto-populated from link `?ref=CODE`).
   - Attributed to the referring agent in the `referrals` table upon successful payment.
5. User clicks "Pay with Apple Pay / Card" to initiate hosted checkout with recurring tokenization.

### 4.3 Universal Feedback & Complaint Flow
1. A persistent floating button labeled **"💬 Feedback / Complaints"** is positioned on all pages (e.g. bottom-right on desktop, header/floating pill on mobile).
2. Available to all visitors (including on login page and public buyer property pages).
3. Clicking opens an accessible modal with:
   - **Topic Dropdown:** Bug Report, Feature Request, Listing Complaint, Billing Issue, General Feedback.
   - **Brief Description:** Textarea detailing the issue or suggestion.
   - **Contact Details:** Name, Email Address, and Phone/WhatsApp number.
4. On Submit:
   - Records the submission in `feedback_submissions` with timestamp, page URL, and recipient `'mswebdevelopments.uae@gmail.com'`.
   - Dispatches email notification to `mswebdevelopments.uae@gmail.com` via Supabase Edge Function / Email integration with client fallback.
   - Shows confirmation alert: *"Thank you! Your feedback has been received and forwarded to mswebdevelopments.uae@gmail.com. We will review it shortly."*

### 4.4 Multi-Device Responsive Design System
1. **Breakpoints:**
   - Mobile: `< 768px`
   - Tablet: `768px – 1024px`
   - Desktop: `> 1024px`
2. **Dashboard Adaptations:**
   - *Desktop:* Dual-pane split screen with sticky left column (search + property cards) and right column (Leaflet Dubai map).
   - *Tablet:* Adaptive layout with collapsible filter drawer and toggleable map view.
   - *Mobile:* Dedicated bottom navigation toggle:
     - `📋 List View (X properties)`
     - `🗺️ Map View`
     - Allows agents on mobile phones to switch with a single tap between browsing property cards and panning the Dubai map.
3. **Form & Admin Adaptations:**
   - `PropertyForm`: Converts to single-column vertical flow with large mobile touch targets for PDF and photo uploads.
   - `AdminApprovals`: Stacks specs inspection and brochure PDF viewer vertically on mobile with full-width action buttons.
   - `PublicPropertyView`: Full-bleed mobile gallery carousel and sticky bottom realtor WhatsApp CTA bar.
   - `Navbar`: Mobile slide-out hamburger menu with quick role switcher.
