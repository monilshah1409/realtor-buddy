# Design Document: Realtor Buddy (Dubai Real Estate Web App)

**Date:** 2026-10-24  
**Status:** In Review (Updated with Handover Timelines)  
**Authors:** Antigravity Engineering & Product Partner  

---

## 1. Intent and Why

Real estate agents in Dubai operate in a high-velocity, competitive market where client requirements change rapidly across property types (studios, 1BHKs, 2BHKs, villas, townhouses), localities (e.g., Downtown Dubai, Dubai Marina, Business Bay, JVC, Dubai Hills), price budgets, and **completion timelines (ready vs. off-plan handover)**. Agents need a specialized tool—**Realtor Buddy**—to rapidly search, map, shortlist, and share properties directly with prospective buyers.

Critical domain realities in Dubai real estate:
1. **Completion & Handover Diversity:** Buyers often have distinct timeline needs—some need immediate occupancy (**Ready to Move In**), others want projects **near handover** (e.g., Q4 2026 / Q1 2027), while investors look for **newly launched off-plan** projects with long construction horizons (e.g., 2028–2029) and staged payment milestones.
2. **Stretchable Budgets:** A buyer's budget is rarely a hard ceiling—it can stretch for high-value properties in desirable locations.
3. **Nearby Localities / Adjacent Communities:** If a buyer is searching for "Downtown Dubai", an exceptional property 5 minutes away in "Business Bay" or "DIFC" that matches their bedroom count and budget is an enormous missed opportunity if filtered out. Hard locality filters cause lost sales.

Realtor Buddy addresses this with a smart property matching and scoring engine that factors in **completion timelines**, **budget stretch tolerances**, and **geographic proximity across neighboring Dubai communities** to surface and rank high-potential recommendations.

Furthermore, when agents share properties with buyers, they risk losing commission if buyers bypass them to contact the developer directly or price-shop on open portals. Realtor Buddy solves this by giving agents a branded, friction-free sharing view that showcases the property, visuals, and brochure, while strictly concealing developer identity and pricing.

Finally, Realtor Buddy is a **commercial product with a paid subscription model (paywall)** powered by a licensed UAE payment gateway (such as Ziina Business or PayTabs) with Apple Pay and local card support. Restricting agent accounts behind a subscription paywall combined with admin verification (Monil & Edwin) ensures a viable SaaS revenue stream and naturally filters out casual buyers and non-professionals while maintaining complete PCI-DSS compliance.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Handover & Completion Timeline Tracking:** Track and filter listings by completion stage:
  - `Ready to Move In` (immediate occupancy / resale).
  - `Near Handover` (e.g., within 6–12 months, Q4 2026 / Q1 2027).
  - `Under Construction / Newly Launched` (e.g., 2028+).
  - Approximate handover quarter/year clearly indicated on cards, map pins, and buyer sheets.
- **Smart Match Scoring with Nearby Locality Expansion & Flexible Budgeting:** Rather than rigid binary filters:
  - *Handover Alignment:* Match buyer timeline preference (Ready vs Off-plan timeline).
  - *Locality Proximity:* Match exact target localities (100% location score) AND evaluate adjacent/neighboring Dubai communities (e.g., Downtown <-> Business Bay, Marina <-> JLT <-> JBR, JVC <-> JVT), surfacing nearby properties with a clear "Nearby Community" badge.
  - *Budget Stretch:* Allow an adjustable budget stretch factor (e.g., +10% to +20%), ranking properties by composite match percentage (e.g., 95% Match) and tagging high-value stretch opportunities.
- **Commercial UAE Agent Paywall:** Restrict full platform access behind an agent subscription model using a licensed UAE payment gateway (Ziina/PayTabs) supporting Apple Pay and local credit/debit cards, tracking account billing and active subscription states (`trial`, `active`, `past_due`, `canceled`).
- **Protected Onboarding & Verification:** Agent signups go through both subscription verification and admin approval (Monil & Edwin) to guarantee that only licensed/active real estate professionals access wholesale pricing and developer details.
- **Dubai-Specific Search & Filtering:** Filter listings by Dubai localities/communities, price ranges (AED), unit types (studio, 1BHK, 2BHK, 3BHK+, villa, townhouse), handover status, and area (sq ft).
- **Interactive Map:** Visual Dubai map pins representing property locations, color-coded by match status (Exact Match vs. Nearby Area vs. Stretch Opportunity) and tagged with handover status, synchronized with the search results.
- **Dual-Tier Ingestion & Human Review:**
  - *Admin/Developer Additions:* Enter global listings immediately.
  - *Agent Additions:* Private to that agent immediately (so they can shortlist and share right away), placed in a pending verification queue for the platform admins (Monil and Edwin).
  - *Admin Approval Queue:* Simple, flexible review where admins inspect the brochure, handover date, and specs, and one-click toggle the listing to global.
- **Client-Facing Shareable Web Links:** Public, unauthenticated property pages and multi-property shortlist collections branded under the sharing agent's profile, containing property highlights, handover timeline, specs, and an embedded PDF brochure viewer.
- **Commission Protection:** Completely hide property pricing and developer identity on the public buyer view.
- **Zero-Storage-Cost Architecture:** Integrate Microsoft Graph API to stream agent-uploaded PDF brochures directly into the owner's OneDrive, embedding them directly on-page so neither database limits nor user redirects occur.
- **High Performance & Low Data Footprint:** Fast rendering and minimal bandwidth consumption for mobile agents on cellular networks.

### Non-Goals
- Direct real estate transaction processing, escrow handling, or digital mortgage applications.
- Automatic RERA/DLD government registry API scraping (verification is human-directed via brochure inspection).
- In-app messaging or buyer chat accounts (buyers contact agents directly via WhatsApp/phone CTA on the public page).
- Programmatic PDF redaction (the platform displays brochures as uploaded by the agent, while strictly concealing pricing and developer fields from all public HTML and API responses).

### Anti-Goals
- **No Self-Hosted Card Data (PCI Risk):** Never touch or store raw card numbers; use fully hosted payment checkouts from a licensed UAE gateway.
- **No Unpaid Access to Agent Tools:** Unsubscribed or unverified users must not access wholesale property search, internal pricing, or map discovery.
- **No Buyer Redirects:** The buyer must never be redirected to external storage platforms like OneDrive or Google Drive when viewing a brochure.
- **No Information Leakage:** Under no circumstances should the public buyer view expose the developer name or listing price.
- **No Lost Deals from Rigid Filters:** Hard price or strict locality borders must not hide properties in adjacent neighborhoods or slightly above nominal budget that represent superior matches.

---

## 3. Constraints

- **Database & Auth:** Supabase Free Tier (PostgreSQL database, Supabase Auth, Row-Level Security).
- **Paywall / Billing:** Licensed UAE Gateway (Ziina / PayTabs) via hosted checkout links and secure webhooks.
- **Storage Strategy:** 
  - Heavy multi-megabyte PDF brochures reside on OneDrive via Microsoft Graph API.
  - Property gallery photos and agent profile avatars are compressed client-side and hosted in Supabase Storage (fitting easily within the 1 GB free quota).
- **PDF Upload Flow:** Agents upload PDF brochures directly from their local desktop; the backend transfers the file to the owner's OneDrive via Microsoft Graph API.
- **Geographic Focus:** Dubai, UAE (localities, currency in AED, metric/sq ft dimensions).
- **Performance:** Lightweight bundle size (<250 KB initial gzip load) for quick mobile rendering and low cellular data usage.

---

## 4. Architecture & Implementation Decisions

### Frontend: Vite + React SPA + Leaflet
- Single-page application built with React, Vite, Tailwind CSS, and Leaflet (OpenStreetMap).
- Fast client-side rendering with instant search, handover filtering, and match-score recalculation.
- Zero-cost static hosting (Vercel, Netlify, or Cloudflare Pages).

### Backend & Database: Supabase Free Tier
- PostgreSQL database with Row-Level Security (RLS) guaranteeing that private properties and wholesale pricing/developer fields are never leaked to public endpoints.
- Supabase Auth for agent and admin sessions.
- Supabase Storage with client-side image compression for property and profile images.

### Storage & Brochure Streaming: Microsoft Graph API + OneDrive
- PDF brochures uploaded from agents' desktops are pushed to the platform owner's OneDrive via Microsoft Graph API.
- Embedded in-page PDF viewer displays brochures directly on the web page without external redirects.

### Paywall & Onboarding: UAE Gateway (Ziina / PayTabs) + Admin Approval
- New agents subscribe via a hosted checkout link supporting Apple Pay and UAE credit/debit cards.
- Webhook updates `profiles.subscription_status = 'active'`.
- Admins (Monil & Edwin) review the agent's credentials and toggle `profiles.status = 'active'`.

---

## 5. Data Models & Detailed Flows

### 5.1 Profiles Table (`profiles`)
- `id` (UUID, primary key, references `auth.users`)
- `full_name` (text)
- `agency_name` (text)
- `phone_number` (text)
- `whatsapp_number` (text)
- `avatar_url` (text)
- `role` (enum: `admin`, `agent`)
- `status` (enum: `pending_approval`, `active`, `suspended`)
- `subscription_status` (enum: `inactive`, `trial`, `active`, `past_due`, `canceled`)
- `gateway_customer_id` (text, nullable)
- `created_at` (timestamp)

### 5.2 Properties Table (`properties`)
- `id` (UUID, primary key)
- `title` (text)
- `description` (text)
- `property_type` (enum: `studio`, `1bhk`, `2bhk`, `3bhk`, `4bhk_plus`, `villa`, `townhouse`, `penthouse`)
- `locality` (text, e.g., "Downtown Dubai", "Dubai Marina", "Business Bay", "JVC", "Dubai Hills")
- `sub_community` (text, optional)
- **`handover_status`** (enum: `ready`, `near_handover`, `under_construction`, `newly_launched`)
- **`handover_date`** (text, e.g., "Ready to Move In", "Q4 2026", "Q2 2027", "Q4 2028")
- `price_aed` (numeric, visible only to active subscribed agents and admins)
- `developer_name` (text, visible only to active subscribed agents and admins)
- `area_sqft` (numeric)
- `bedrooms` (integer)
- `bathrooms` (integer)
- `latitude` (numeric)
- `longitude` (numeric)
- `photos` (text array, Supabase Storage URLs)
- `brochure_onedrive_url` (text, direct embed/download URL on OneDrive)
- `brochure_file_name` (text)
- `status` (enum: `private`, `global`, `rejected`)
- `created_by` (UUID, references `auth.users`)
- `approved_by` (UUID, references `auth.users`, nullable)
- `share_token` (text, unique nanoid for direct property sharing)
- `created_at`, `updated_at` (timestamps)

### 5.3 Shortlists & Shortlist Items
- `shortlists`: `id`, `agent_id`, `client_name`, `share_token`, `notes`, `created_at`
- `shortlist_items`: `id`, `shortlist_id`, `property_id`, `order_index`

### 5.4 Smart Match Scoring & Proximity Engine

#### Dubai Locality Proximity Clusters
The system includes a pre-mapped adjacency matrix of major Dubai clusters:
- **Central Core:** Downtown Dubai ↔ Business Bay ↔ DIFC ↔ City Walk
- **Coastal & Marina:** Dubai Marina ↔ JBR ↔ JLT ↔ Bluewaters ↔ Palm Jumeirah
- **Villa & Family Communities:** Dubai Hills Estate ↔ Arabian Ranches ↔ Meydan ↔ Al Barari
- **Emerging & Value Hubs:** JVC (Jumeirah Village Circle) ↔ JVT ↔ Arjan ↔ Motor City ↔ Dubai Sports City
- **Creek & Historic:** Dubai Creek Harbour ↔ Festival City ↔ Culture Village

#### Scoring Algorithm
When an agent enters a client search (Target Locality, Desired Unit Type, Handover Preference, Budget, Min Sq Ft):
1. **Location Matching (30 points):**
   - Exact Locality match = 30 points (Badge: `📍 Target Location`).
   - Adjacent Cluster Locality = 24 points (Badge: `🚗 Nearby Community - 5-10 min`).
   - Other Locality = 8 points.
2. **Handover Timeline Matching (15 points):**
   - Exact match to buyer's timeline (e.g. Ready vs Near Handover vs Newly Launched) = 15 points.
   - Close timeline (e.g. near handover when ready requested) = 10 points.
3. **Unit Type & Bedrooms (20 points):**
   - Exact bedroom & type match = 20 points.
   - Compatible type = 14 points.
4. **Size / Sq Ft (10 points):**
   - Meets or exceeds requested area = 10 points.
   - Within 10% of requested area = 7 points.
5. **Budget Score (25 points):**
   - `price <= budget` = 25 points (Badge: `💰 Within Budget`).
   - `budget < price <= budget * (1 + stretch)` (e.g. up to +15% stretch) = 18 to 22 points (Badge: `⭐ High-Value Stretch`).
   - `price > budget * (1 + stretch)` = 5 to 10 points.

**Overall Composite Score:** Properties with score $\ge 70\%$ are prioritized on the map and list, sorted from highest match score to lowest.

### 5.5 Public Buyer View
- Hosted at `/share/:share_token` or `/shortlist/:share_token`.
- Fully responsive mobile & desktop view framed with the sharing agent's branding and WhatsApp contact button.
- Displays property specifications and **approximate handover timeline** (e.g., `🔑 Ready to Move In` or `🏗️ Handover: Q4 2026`).
- Cleanly strips `price_aed` and `developer_name` at the database RLS level.
- Embedded in-page PDF brochure viewer with zoom and "Download PDF" options.

---

## 6. What Is Left to the Builder

- **UI Component Library:** Tailwind CSS design system with a clean, luxury modern aesthetic tailored for Dubai real estate.
- **Map Implementation:** Leaflet setup with OpenStreetMap tiles and custom pin markers reflecting match levels and handover status.
- **Dubai Locality Adjacency Data:** Static JSON mapping of Dubai communities and their neighbor clusters.
- **UAE Payment Gateway Adapter:** Webhook receiver and checkout redirection for Ziina/PayTabs.
- **OneDrive Upload Handler:** API route for Microsoft Graph API upload and embed-link generation.
- **Supabase Migrations & Seed Data:** Complete SQL scripts with schema, RLS policies, handover fields, and realistic mock Dubai properties across Downtown, Business Bay, Marina, JLT, JVC, and Dubai Hills.
