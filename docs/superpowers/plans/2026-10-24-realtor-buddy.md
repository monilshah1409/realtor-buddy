# Realtor Buddy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Realtor Buddy", a fast, lightweight web application for Dubai real estate agents featuring smart match scoring with budget stretch and nearby locality expansion, interactive Dubai map discovery, dual-tier listing ingestion with an admin approval queue, desktop-to-OneDrive PDF brochure streaming via Microsoft Graph API, unauthenticated buyer-facing shareable pages that conceal pricing and developer identity, and a commercial UAE payment gateway paywall.

**Architecture:** Client-side SPA built with Vite, React, TypeScript, Tailwind CSS, and Leaflet (OpenStreetMap) communicating with Supabase Free Tier (PostgreSQL, Auth, Storage, Row-Level Security). Heavy PDF brochures are streamed from agents' desktops to OneDrive via Microsoft Graph API and embedded in-page, while property images use client-side compression in Supabase Storage. Unauthenticated buyer links securely display properties without price or developer data.

**Tech Stack:** React 18+, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet, `@supabase/supabase-js`, Microsoft Graph API Client, Vitest, `@testing-library/react`.

**Spec:** [docs/superpowers/specs/2026-10-24-realtor-buddy-design.md](file:///Users/Monil_149/Documents/Realtor%20Buddy/docs/superpowers/specs/2026-10-24-realtor-buddy-design.md)

## Global Constraints

- Geographic Scope: Dubai, UAE (localities, AED currency, sq ft dimensions).
- Database & Auth: Supabase Free Tier with PostgreSQL, Supabase Auth, and Row-Level Security (RLS).
- Zero-Storage-Cost PDFs: PDF brochures must reside on OneDrive via Microsoft Graph API and render in-page without external redirects.
- Image Storage: Photos compressed client-side and stored in Supabase Storage (strictly within 1 GB free quota).
- Information Protection: Under no circumstances may public buyer views or API endpoints expose `price_aed` or `developer_name`.
- Performance: Initial gzipped bundle target < 250 KB for rapid rendering on mobile cellular networks.

## Review Focus

1. **Information Leakage via API/DOM:** Ensure public buyer endpoints physically exclude `price_aed` and `developer_name` from Supabase payloads, so inspecting network traffic or React state reveals zero wholesale data.
2. **Budget Stretch Boundary Handling:** Ensure properties within the stretch threshold (+1% to +15%) are positively highlighted as "High-Value Stretch" rather than filtered out or penalized as out-of-budget.
3. **Locality Adjacency Fallback:** Ensure an invalid or unmapped locality gracefully falls back to direct name matching without crashing the scoring engine.
4. **OneDrive Embed Failures:** If an embedded OneDrive PDF fails to load or third-party cookies are blocked, ensure a clean fallback download button and preview placeholder are rendered.
5. **Paywall Gate Bypasses:** Ensure direct URL navigation to `/dashboard`, `/search`, or `/properties/new` redirects unauthenticated or unpaid users directly to the subscription/approval gate.

---

### Task 1: Project Scaffolding, Core Types & Testing Harness

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `src/types/index.ts`
- Create: `src/data/mockProperties.ts`
- Create: `src/data/dubaiClusters.ts`
- Test: `src/types/__tests__/types.test.ts`

**Interfaces:**
- Produces: `Property`, `Profile`, `Shortlist`, `DubaiLocality`, `MatchCriteria`, `MatchScoreResult` types, and mock datasets.

- [ ] **Step 1: Write the failing test for core types and mock data**

```typescript
// src/types/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import { mockProperties } from '../../data/mockProperties';
import { DUBAI_CLUSTERS } from '../../data/dubaiClusters';
import type { Property } from '../index';

describe('Core Data & Types', () => {
  it('has valid mock properties with required Dubai real estate fields', () => {
    expect(mockProperties.length).toBeGreaterThanOrEqual(4);
    const first = mockProperties[0];
    expect(first.locality).toBeDefined();
    expect(first.handover_status).toBeDefined();
    expect(first.handover_date).toBeDefined();
    expect(first.price_aed).toBeGreaterThan(0);
  });

  it('contains primary Dubai locality clusters', () => {
    expect(DUBAI_CLUSTERS['Downtown Dubai']).toContain('Business Bay');
    expect(DUBAI_CLUSTERS['Dubai Marina']).toContain('JLT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` or `npx vitest run src/types/__tests__/types.test.ts`  
Expected: FAIL with missing modules.

- [ ] **Step 3: Scaffold Vite React TypeScript app with Tailwind CSS and define types**

Implement `src/types/index.ts` defining:
```typescript
export type PropertyType = 'studio' | '1bhk' | '2bhk' | '3bhk' | '4bhk_plus' | 'villa' | 'townhouse' | 'penthouse';
export type HandoverStatus = 'ready' | 'near_handover' | 'under_construction' | 'newly_launched';
export type PropertyStatus = 'private' | 'global' | 'rejected';
export type UserRole = 'admin' | 'agent';
export type SubscriptionStatus = 'inactive' | 'trial' | 'active' | 'past_due' | 'canceled';

export interface Property {
  id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  locality: string;
  sub_community?: string;
  handover_status: HandoverStatus;
  handover_date: string;
  price_aed: number;
  developer_name: string;
  area_sqft: number;
  bedrooms: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  photos: string[];
  brochure_onedrive_url?: string;
  brochure_file_name?: string;
  status: PropertyStatus;
  created_by: string;
  approved_by?: string;
  share_token: string;
  created_at: string;
  updated_at: string;
}
```
Populate `src/data/dubaiClusters.ts` and `src/data/mockProperties.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/types.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold project, define domain types, and mock Dubai real estate datasets"
```

---

### Task 2: Dubai Proximity & Smart Match Scoring Engine

**Files:**
- Create: `src/utils/scoring.ts`
- Test: `src/utils/__tests__/scoring.test.ts`

**Interfaces:**
- Consumes: `Property`, `MatchCriteria`, `DUBAI_CLUSTERS` from Task 1.
- Produces: `calculateMatchScore(property: Property, criteria: MatchCriteria): MatchScoreResult`, `sortPropertiesByMatch(properties: Property[], criteria: MatchCriteria): (Property & { score: MatchScoreResult })[]`.

- [ ] **Step 1: Write the failing tests for match scoring and proximity**

```typescript
// src/utils/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from '../scoring';
import type { Property, MatchCriteria } from '../../types';

describe('Match Scoring Engine', () => {
  const baseProperty: Property = {
    id: 'prop-1',
    title: 'Luxury 1BHK Downtown',
    description: 'Direct Burj view',
    property_type: '1bhk',
    locality: 'Downtown Dubai',
    handover_status: 'ready',
    handover_date: 'Ready to Move In',
    price_aed: 1600000,
    developer_name: 'Emaar',
    area_sqft: 850,
    bedrooms: 1,
    bathrooms: 2,
    latitude: 25.1972,
    longitude: 55.2744,
    photos: [],
    status: 'global',
    created_by: 'admin',
    share_token: 'token-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('scores 100% for an exact match within budget', () => {
    const criteria: MatchCriteria = {
      targetLocality: 'Downtown Dubai',
      propertyType: '1bhk',
      bedrooms: 1,
      targetBudgetAed: 1700000,
      budgetStretchPercent: 15,
      minSqft: 800,
      preferredHandover: 'ready',
    };
    const result = calculateMatchScore(baseProperty, criteria);
    expect(result.totalScore).toBe(100);
    expect(result.isWithinBudget).toBe(true);
    expect(result.isStretchMatch).toBe(false);
    expect(result.localityTag).toBe('Target Location');
  });

  it('scores adjacent community as nearby match with high score', () => {
    const businessBayProp: Property = {
      ...baseProperty,
      id: 'prop-2',
      locality: 'Business Bay',
    };
    const criteria: MatchCriteria = {
      targetLocality: 'Downtown Dubai',
      propertyType: '1bhk',
      bedrooms: 1,
      targetBudgetAed: 1700000,
      budgetStretchPercent: 15,
      minSqft: 800,
      preferredHandover: 'ready',
    };
    const result = calculateMatchScore(businessBayProp, criteria);
    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.localityTag).toContain('Nearby Community');
  });

  it('identifies budget stretch opportunities within the stretch margin', () => {
    const stretchProp: Property = {
      ...baseProperty,
      price_aed: 1800000, // Budget is 1.7M, +15% stretch is up to 1.955M
    };
    const criteria: MatchCriteria = {
      targetLocality: 'Downtown Dubai',
      propertyType: '1bhk',
      bedrooms: 1,
      targetBudgetAed: 1700000,
      budgetStretchPercent: 15,
      minSqft: 800,
      preferredHandover: 'ready',
    };
    const result = calculateMatchScore(stretchProp, criteria);
    expect(result.isWithinBudget).toBe(false);
    expect(result.isStretchMatch).toBe(true);
    expect(result.budgetTag).toBe('High-Value Stretch');
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/scoring.test.ts`  
Expected: FAIL with `calculateMatchScore is not a function`.

- [ ] **Step 3: Implement scoring engine in `src/utils/scoring.ts`**

Implement composite point breakdown:
- Location: 30 pts (exact = 30, cluster adjacent = 24, other = 8)
- Handover timeline: 15 pts (exact = 15, close = 10, other = 5)
- Unit type & bedrooms: 20 pts (exact = 20, compatible = 14, other = 5)
- Size: 10 pts
- Budget: 25 pts (at or under budget = 25, within stretch window = 18-22 with `isStretchMatch = true`, over stretch = 5)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/scoring.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: implement Dubai locality proximity and smart match scoring engine"
```

---

### Task 3: Supabase Schema, Security Migrations & Client

**Files:**
- Create: `supabase/migrations/20261024000000_initial_schema.sql`
- Create: `src/lib/supabase.ts`
- Test: `src/lib/__tests__/supabase.test.ts`

**Interfaces:**
- Produces: `supabase` client instance, typed SQL schema with RLS policies ensuring public queries cannot read `price_aed` or `developer_name`.

- [ ] **Step 1: Write the failing test for Supabase client configuration**

```typescript
// src/lib/__tests__/supabase.test.ts
import { describe, it, expect } from 'vitest';
import { supabase } from '../supabase';

describe('Supabase Client Configuration', () => {
  it('initializes the supabase client with auth persistence', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/supabase.test.ts`  
Expected: FAIL with missing module `../supabase`.

- [ ] **Step 3: Create migration and client configuration**

Write `supabase/migrations/20261024000000_initial_schema.sql` containing:
- `profiles` with role and subscription statuses.
- `properties` with RLS policies:
  - `properties_admin_all`: Admin full access.
  - `properties_agent_select`: Agents can read `global` or their own `created_by` properties.
  - `properties_public_select`: Non-authenticated users can SELECT by `share_token` (and a view `public_properties` that explicitly omits `price_aed` and `developer_name`).
- `shortlists` and `shortlist_items` tables.
Write `src/lib/supabase.ts` instantiating `@supabase/supabase-js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/supabase.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/ src/lib/
git commit -m "feat: configure Supabase client and author initial SQL schema with strict RLS"
```

---

### Task 4: Interactive Dubai Map Component (Leaflet)

**Files:**
- Create: `src/components/map/DubaiMap.tsx`
- Create: `src/components/map/MapMarker.tsx`
- Test: `src/components/map/__tests__/DubaiMap.test.tsx`

**Interfaces:**
- Consumes: `Property`, `MatchScoreResult` from Task 1 & 2.
- Produces: `<DubaiMap properties={scoredProperties} selectedPropertyId={id} onSelectProperty={fn} />`.

- [ ] **Step 1: Write the failing test for Dubai map rendering**

```tsx
// src/components/map/__tests__/DubaiMap.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DubaiMap from '../DubaiMap';
import { mockProperties } from '../../../data/mockProperties';

describe('DubaiMap Component', () => {
  it('renders the map container with Dubai center coordinates', () => {
    const { container } = render(
      <DubaiMap 
        properties={mockProperties.map(p => ({ ...p, score: { totalScore: 90, localityTag: 'Target Location', isStretchMatch: false, isWithinBudget: true, budgetTag: 'Within Budget' } }))} 
        onSelectProperty={() => {}} 
      />
    );
    expect(container.querySelector('.leaflet-container')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/map/__tests__/DubaiMap.test.tsx`  
Expected: FAIL with component missing.

- [ ] **Step 3: Implement DubaiMap and custom marker components**

Implement Leaflet map centered at `[25.2048, 55.2708]` (Dubai) with:
- Custom SVG pin markers colored by match tier (Emerald for $\ge 90\%$, Sky Blue for Nearby Community, Amber for High-Value Stretch).
- Interactive popup showing title, locality, handover status, and score badge.
- Marker click callback invoking `onSelectProperty`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/map/__tests__/DubaiMap.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/map/
git commit -m "feat: implement interactive Leaflet Dubai map with match-status markers"
```

---

### Task 5: Search & Filter Controls, Budget Slider & Property Cards

**Files:**
- Create: `src/components/search/FilterBar.tsx`
- Create: `src/components/property/PropertyCard.tsx`
- Create: `src/components/property/PropertyList.tsx`
- Test: `src/components/search/__tests__/FilterBar.test.tsx`
- Test: `src/components/property/__tests__/PropertyCard.test.tsx`

**Interfaces:**
- Consumes: `MatchCriteria`, `Property`, `MatchScoreResult`.
- Produces: Search bar with locality selector, handover toggles, budget slider (+0% to +30%), and interactive property cards.

- [ ] **Step 1: Write failing tests for FilterBar and PropertyCard**

```tsx
// src/components/property/__tests__/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PropertyCard from '../PropertyCard';
import { mockProperties } from '../../../data/mockProperties';

describe('PropertyCard', () => {
  it('displays wholesale price and developer for authenticated agents', () => {
    const prop = mockProperties[0];
    render(
      <PropertyCard 
        property={prop} 
        score={{ totalScore: 94, localityTag: 'Target Location', isStretchMatch: false, isWithinBudget: true, budgetTag: 'Within Budget' }} 
        onAddToShortlist={() => {}}
      />
    );
    expect(screen.getByText(new RegExp(prop.developer_name, 'i'))).toBeTruthy();
    expect(screen.getByText(/AED/i)).toBeTruthy();
    expect(screen.getByText(/94% Match/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(prop.handover_date, 'i'))).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/property/__tests__/PropertyCard.test.tsx`  
Expected: FAIL with `PropertyCard is not defined`.

- [ ] **Step 3: Implement FilterBar, PropertyCard, and PropertyList**

- Build `FilterBar`: Locality dropdown (with major Dubai areas), property type tabs, handover status pills (`Ready`, `Near Handover`, `Off-plan`), budget number input, and `Budget Stretch (+0% to +30%)` range slider.
- Build `PropertyCard`: Luxury card design showing property image, match score badge, locality badge, handover timeline badge, bedroom/bathroom/sqft specs, wholesale price (AED), developer name, and "Add to Shortlist" button.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/property/__tests__/PropertyCard.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: implement search filters with budget stretch slider and property cards"
```

---

### Task 6: Desktop PDF Upload & Microsoft Graph API OneDrive Streaming

**Files:**
- Create: `src/services/storageService.ts`
- Create: `src/components/property/PropertyForm.tsx`
- Test: `src/services/__tests__/storageService.test.ts`
- Test: `src/components/property/__tests__/PropertyForm.test.tsx`

**Interfaces:**
- Consumes: Microsoft Graph API configuration.
- Produces: `uploadBrochureToOneDrive(file: File): Promise<{ webUrl: string; embedUrl: string; fileName: string }>`, `compressAndUploadPhoto(file: File): Promise<string>`, `PropertyForm` component.

- [ ] **Step 1: Write the failing tests for storage service and property form**

```typescript
// src/services/__tests__/storageService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { uploadBrochureToOneDrive } from '../storageService';

describe('Storage Service', () => {
  it('uploads PDF brochure to OneDrive and returns direct embed url', async () => {
    const mockFile = new File(['%PDF-1.4 dummy content'], 'dubai_brochure.pdf', { type: 'application/pdf' });
    const result = await uploadBrochureToOneDrive(mockFile);
    expect(result.embedUrl).toContain('onedrive');
    expect(result.fileName).toBe('dubai_brochure.pdf');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/storageService.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement storageService and PropertyForm**

- In `storageService.ts`: Implement Graph API streaming handler (with sandbox/mock fallback when offline) that uploads local desktop `.pdf` to `/RealtorBuddy/Brochures/` and extracts embed/download URLs. Implement canvas-based image compression for gallery photos uploading to Supabase Storage.
- In `PropertyForm.tsx`: Form with validation for Dubai property fields, drag-and-drop desktop PDF picker, photo uploader, and map coordinate picker. Submissions set `status = 'private'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/__tests__/storageService.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/ src/components/property/PropertyForm.tsx
git commit -m "feat: implement desktop PDF upload streaming to OneDrive and property creation form"
```

---

### Task 7: Admin Verification & Approval Dashboard

**Files:**
- Create: `src/pages/admin/AdminApprovals.tsx`
- Create: `src/components/pdf/BrochureViewer.tsx`
- Test: `src/pages/admin/__tests__/AdminApprovals.test.tsx`

**Interfaces:**
- Consumes: Pending properties from Supabase / mock store.
- Produces: Split-screen approval queue allowing Monil & Edwin to inspect property details alongside the in-page PDF brochure, and one-click approve as `global`.

- [ ] **Step 1: Write the failing test for admin approvals**

```tsx
// src/pages/admin/__tests__/AdminApprovals.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminApprovals from '../AdminApprovals';
import { mockProperties } from '../../../data/mockProperties';

describe('AdminApprovals Dashboard', () => {
  it('renders pending properties with brochure viewer and approve button', () => {
    const pendingProp = { ...mockProperties[0], status: 'private' as const };
    const handleApprove = vi.fn();
    render(<AdminApprovals pendingProperties={[pendingProp]} onApprove={handleApprove} onReject={() => {}} />);
    
    expect(screen.getByText(new RegExp(pendingProp.title, 'i'))).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve as Global/i })).toBeTruthy();
    
    fireEvent.click(screen.getByRole('button', { name: /Approve as Global/i }));
    expect(handleApprove).toHaveBeenCalledWith(pendingProp.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/admin/__tests__/AdminApprovals.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement BrochureViewer and AdminApprovals**

- Implement `BrochureViewer.tsx`: Clean embedded PDF viewer supporting zoom, full-screen toggle, and direct download fallback.
- Implement `AdminApprovals.tsx`: Split layout with pending submission queue, specs inspection (developer, handover date, price, locality), embedded brochure viewer, and "Approve as Global" / "Request Changes" actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/admin/__tests__/AdminApprovals.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ src/components/pdf/
git commit -m "feat: implement admin property approval queue with side-by-side brochure inspector"
```

---

### Task 8: Public Buyer Presentation View (Shareable Link)

**Files:**
- Create: `src/pages/public/PublicPropertyView.tsx`
- Create: `src/pages/public/PublicShortlistView.tsx`
- Test: `src/pages/public/__tests__/PublicPropertyView.test.tsx`

**Interfaces:**
- Consumes: `share_token`, `Property`, `Profile`.
- Produces: Unauthenticated buyer-facing property view and shortlist collection view.

- [ ] **Step 1: Write the failing test for the public buyer view**

```tsx
// src/pages/public/__tests__/PublicPropertyView.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PublicPropertyView from '../PublicPropertyView';
import { mockProperties } from '../../../data/mockProperties';

describe('PublicPropertyView (Buyer Presentation)', () => {
  const property = mockProperties[0];
  const agentProfile = {
    full_name: 'Sarah Jenkins',
    agency_name: 'Dubai Luxury Real Estate',
    whatsapp_number: '+971501234567',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  it('renders property specs, handover date, and agent WhatsApp CTA without price or developer', () => {
    const { container } = render(<PublicPropertyView property={property} agent={agentProfile} />);
    
    // Shows agent branding
    expect(screen.getByText(/Sarah Jenkins/i)).toBeTruthy();
    expect(screen.getByText(/Dubai Luxury Real Estate/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeTruthy();
    
    // Shows handover timeline and specs
    expect(screen.getByText(new RegExp(property.handover_date, 'i'))).toBeTruthy();
    expect(screen.getByText(new RegExp(property.locality, 'i'))).toBeTruthy();
    
    // CRITICAL: NEVER reveals price or developer
    expect(container.textContent).not.toContain(property.developer_name);
    expect(container.textContent).not.toContain(property.price_aed.toLocaleString());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/public/__tests__/PublicPropertyView.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement PublicPropertyView and PublicShortlistView**

- Build `PublicPropertyView.tsx`: Displays hero image gallery, property overview, specs (bedrooms, bathrooms, sq ft, handover status), embedded PDF brochure viewer, and sticky Realtor profile header with direct WhatsApp button. Explicitly omits `price_aed` and `developer_name`.
- Build `PublicShortlistView.tsx`: Multi-property carousel and side-by-side comparison for client shortlists.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/public/__tests__/PublicPropertyView.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/public/
git commit -m "feat: implement public unauthenticated buyer property and shortlist presentation pages"
```

---

### Task 9: UAE Payment Gateway Integration & Subscription Paywall Gate

**Files:**
- Create: `src/services/paymentService.ts`
- Create: `src/components/auth/PaywallGate.tsx`
- Create: `src/pages/auth/SubscriptionPage.tsx`
- Test: `src/components/auth/__tests__/PaywallGate.test.tsx`

**Interfaces:**
- Consumes: `SubscriptionStatus`, `UserRole`, `Profile`.
- Produces: `<PaywallGate user={user} profile={profile}>{children}</PaywallGate>`, UAE gateway checkout redirector.

- [ ] **Step 1: Write the failing test for the paywall gate**

```tsx
// src/components/auth/__tests__/PaywallGate.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PaywallGate from '../PaywallGate';

describe('PaywallGate', () => {
  it('blocks access and displays subscription checkout when subscription is inactive', () => {
    const profile = { role: 'agent' as const, status: 'active' as const, subscription_status: 'inactive' as const };
    render(
      <PaywallGate profile={profile}>
        <div>Protected Property Search</div>
      </PaywallGate>
    );
    expect(screen.queryByText('Protected Property Search')).toBeNull();
    expect(screen.getByText(/Subscribe to Realtor Buddy/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pay with Apple Pay \/ Card/i })).toBeTruthy();
  });

  it('allows access when agent has active subscription and approved status', () => {
    const profile = { role: 'agent' as const, status: 'active' as const, subscription_status: 'active' as const };
    render(
      <PaywallGate profile={profile}>
        <div>Protected Property Search</div>
      </PaywallGate>
    );
    expect(screen.getByText('Protected Property Search')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/auth/__tests__/PaywallGate.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement paymentService, PaywallGate, and SubscriptionPage**

- Implement `paymentService.ts`: Integration with UAE-licensed gateway checkout (Ziina/PayTabs hosted session creator with Apple Pay and local card support).
- Implement `PaywallGate.tsx`: Protects internal agent routes. If `subscription_status !== 'active'`, renders plan selection and checkout button; if `status === 'pending_approval'`, renders approval status notice for Monil & Edwin.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/auth/__tests__/PaywallGate.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/paymentService.ts src/components/auth/ src/pages/auth/
git commit -m "feat: implement UAE payment gateway integration and subscription paywall gate"
```

---

### Task 10: App Shell, Navigation & End-to-End Assembly

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/pages/Dashboard.tsx`
- Test: `src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: All components and services from Tasks 1–9.
- Produces: Complete, running Realtor Buddy web application.

- [ ] **Step 1: Write the failing test for the integrated app shell**

```tsx
// src/__tests__/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('Realtor Buddy Main App', () => {
  it('renders application brand, search controls, map, and property list', () => {
    render(<App />);
    expect(screen.getByText(/Realtor Buddy/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search Dubai community/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/App.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Assemble the complete application in `src/App.tsx`**

Connect:
- Responsive navigation with Agent profile status and Admin badge.
- Main dashboard split view: Filter controls + scored PropertyList on the left, interactive Leaflet DubaiMap on the right.
- Routing for `/`, `/properties/new`, `/admin/approvals`, `/share/:shareToken`, and `/shortlist/:shareToken`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/App.test.tsx`  
Expected: PASS

- [ ] **Step 5: Run full test suite and verify build**

Run: `npm test && npm run build`  
Expected: All tests PASS and Vite build succeeds with bundle < 250 KB.

- [ ] **Step 6: Final Commit**

```bash
git add .
git commit -m "feat: assemble complete Realtor Buddy application with map, search, approval, and sharing"
```
