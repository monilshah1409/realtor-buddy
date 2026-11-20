# Bulk Import Location Resolution & Map Registration Notification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically resolve property GPS coordinates (`latitude`, `longitude`) and area/neighborhood (`locality`) via OpenStreetMap Nominatim during bulk Excel and PDF import, and notify the admin whenever a property name is not registered on the map.

**Architecture:**
- `geocodingService.ts`: Pure TypeScript service that queries OpenStreetMap Nominatim with deduplication, in-memory caching, and request pacing.
- `importService.ts`: Extended with `location` metadata on `ImportedRow` and updated `importedRowToProperty` mapping.
- `ImportModal.tsx`: Visual geocoding progress state, per-row location status badge (Verified vs ⚠️ "Not registered on map"), summary alert banner, and filter for unresolved properties.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, OpenStreetMap Nominatim API, Vitest.

---

## File Structure

- **Create:** `src/services/geocodingService.ts` — OpenStreetMap geocoding with caching, deduplication, and rate throttling.
- **Create:** `src/services/__tests__/geocodingService.test.ts` — Unit tests for geocoding, deduplication, caching, and error handling.
- **Modify:** `src/services/importService.ts` — Extend `ImportedRow` with `location` and `locationStatus`; map them to `Property` in `importedRowToProperty`.
- **Create:** `src/services/__tests__/importServiceLocation.test.ts` — Unit tests verifying location enrichment and property conversion.
- **Modify:** `src/components/property/ImportModal.tsx` — Integrate geocoding phase, location status badges, and admin alert notification.
- **Create / Modify:** `src/components/property/__tests__/ImportModalLocation.test.tsx` — Tests for map status rendering and unmapped notification banner.

---

### Task 1: Create Geocoding Service with Deduplication & In-Memory Cache

**Files:**
- Create: `src/services/geocodingService.ts`
- Create: `src/services/__tests__/geocodingService.test.ts`

**Interfaces:**
```ts
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  locality: string;
  found: boolean;
}

export function buildSearchQuery(project: string, building?: string): string;
export function geocodeLocation(query: string, timeoutMs?: number): Promise<GeocodingResult | null>;
export function batchGeocodeRows(
  rows: { project: string; building: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, GeocodingResult | null>>;
export function clearGeocodeCache(): void;
```

- [x] **Step 1: Write unit tests for `geocodingService`**
  - Test `buildSearchQuery`: handles building + project, project only, trims whitespace, appends Dubai, UAE context.
  - Test `geocodeLocation`: successful Nominatim response returns parsed `GeocodingResult`.
  - Test `geocodeLocation`: empty results return `null` (`found: false`).
  - Test `geocodeLocation`: network error or timeout returns `null` safely without throwing.
  - Test `batchGeocodeRows`: deduplicates identical queries and caches results so `fetch` is only called once per unique property name.

- [x] **Step 2: Implement `src/services/geocodingService.ts`**
  - Implement Nominatim query builder prioritizing `building || project`.
  - Implement `geocodeLocation` with `AbortController` timeout (default 5000ms) and custom User-Agent.
  - Implement in-memory Map cache.
  - Implement `batchGeocodeRows` with deduplication and asynchronous pacing.

- [x] **Step 3: Run geocoding service unit tests**
  - Ensure all tests in `src/services/__tests__/geocodingService.test.ts` pass.

---

### Task 2: Extend `importService.ts` with Location Enrichment

**Files:**
- Modify: `src/services/importService.ts`
- Create: `src/services/__tests__/importServiceLocation.test.ts`

- [x] **Step 1: Write unit tests for `importService.ts` location mapping**
  - Test that `importedRowToProperty` uses `row.location.latitude` and `row.location.longitude` when present.
  - Test that `importedRowToProperty` uses `row.location.locality` when present.
  - Test that if `row.location` is missing or `found: false`, it safely defaults to Dubai center (`25.2048, 55.2708`) and sets locality to 'Dubai'.

- [x] **Step 2: Update `ImportedRow` interface and `importedRowToProperty`**
  - Add optional `location?: GeocodingResult | null` and `locationStatus?: 'found' | 'not_found' | 'pending'` to `ImportedRow`.
  - Update `importedRowToProperty(row: ImportedRow, createdBy: string): Partial<Property>` to read `row.location`.

- [x] **Step 3: Run importService tests**
  - Verify that `importedRowToProperty` produces accurate coordinates and localities.

---

### Task 3: Update `ImportModal.tsx` with Geocoding Step, Location Badges & Map Notification

**Files:**
- Modify: `src/components/property/ImportModal.tsx`
- Create: `src/components/property/__tests__/ImportModalLocation.test.tsx`

- [x] **Step 1: Write component tests for `ImportModal` location features**
  - Mock `batchGeocodeRows` from `geocodingService`.
  - Test that after parsing an Excel file, the modal triggers location resolution and displays location statuses in the table.
  - Test that rows with a verified location show a green "Verified Location" badge with locality name.
  - Test that rows where location is not found show a `⚠️ Not registered on map` badge.
  - Test that an alert banner appears when unresolved properties exist: *"X properties could not be found on Google Maps / OpenStreetMap"*.
  - Test that clicking "Filter Unmapped" filters the preview to only show the problematic rows.

- [x] **Step 2: Update `ImportModal.tsx` UI and logic**
  - Add `isGeocoding` state and progress indicators.
  - After `parseExcelFile` or `parsePdfWithGemini` succeeds, run `batchGeocodeRows` on the parsed rows.
  - Attach the resolved `GeocodingResult` to each row in state.
  - Add a **Location** column to the preview table with status badges and address tooltips.
  - Add the Admin Alert notification banner at the top of the preview when unmapped properties exist.
  - Add an unmapped filter toggle button next to the search/filter controls.
  - Pass the geocoded rows to `onImport` via `importedRowToProperty(row, '')`.

- [x] **Step 3: Run ImportModal component tests**
  - Confirm table renders badges and notification alert correctly.

---

### Task 4: End-to-End Verification and Polish

- [x] **Step 1: Verify build and type-checking**
  - Run TypeScript compile check and ensure zero type errors.

- [x] **Step 2: Visual and functional review**
  - Verify styling in both light/dark modes and mobile responsive view.
  - Verify edge cases: completely empty building/project name, foreign addresses, rate throttling with multiple rows.
