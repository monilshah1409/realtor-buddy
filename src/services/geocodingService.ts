/**
 * geocodingService.ts
 *
 * Open-source geocoding service using OpenStreetMap Nominatim.
 * Resolves building/project names into GPS coordinates and localities
 * with built-in deduplication, in-memory caching, and error safety.
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  locality: string;
  found: boolean;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

/** In-memory cache of search queries to results to prevent redundant calls */
const geocodeCache = new Map<string, GeocodingResult | null>();

/**
 * Builds an optimized search query string for Dubai/UAE real estate listings.
 */
export function buildSearchQuery(project: string, building?: string): string {
  const cleanProject = (project || '').trim();
  const cleanBuilding = (building || '').trim();

  const parts: string[] = [];

  if (cleanBuilding && cleanBuilding.toLowerCase() !== cleanProject.toLowerCase()) {
    parts.push(cleanBuilding);
  }
  if (cleanProject) {
    parts.push(cleanProject);
  }

  if (parts.length === 0) {
    return 'Dubai, United Arab Emirates';
  }

  return `${parts.join(', ')}, Dubai, United Arab Emirates`;
}

/**
 * Geocodes a single query string using OpenStreetMap Nominatim API.
 * Uses an AbortController timeout to guarantee it never hangs.
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

export async function geocodeLocation(
  query: string,
  timeoutMs: number = 5000
): Promise<GeocodingResult | null> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  if (geocodeCache.has(normalizedQuery)) {
    return geocodeCache.get(normalizedQuery) ?? null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${NOMINATIM_BASE_URL}?q=${encodeURIComponent(
      normalizedQuery
    )}&format=json&addressdetails=1&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      geocodeCache.set(normalizedQuery, null);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      geocodeCache.set(normalizedQuery, null);
      return null;
    }

    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    if (isNaN(lat) || isNaN(lon)) {
      geocodeCache.set(normalizedQuery, null);
      return null;
    }

    const addr = first.address || {};
    const locality =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.district ||
      addr.city_district ||
      addr.city ||
      'Dubai';

    const result: GeocodingResult = {
      latitude: lat,
      longitude: lon,
      displayName: first.display_name || normalizedQuery,
      locality,
      found: true,
    };

    geocodeCache.set(normalizedQuery, result);
    return result;
  } catch {
    clearTimeout(timer);
    // On network failure or abort, return null safely
    geocodeCache.set(normalizedQuery, null);
    return null;
  }
}

/**
 * Batches geocoding for a collection of imported rows.
 * Deduplicates queries by unique building/project name so that 100 rows in the
 * same tower only trigger 1 network call.
 */
export async function batchGeocodeRows(
  rows: { project: string; building: string }[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeocodingResult | null>> {
  const queryToResult = new Map<string, GeocodingResult | null>();

  // Extract unique queries
  const uniqueQueries = Array.from(
    new Set(rows.map((r) => buildSearchQuery(r.project, r.building)))
  );

  const total = uniqueQueries.length;
  let completed = 0;

  for (const query of uniqueQueries) {
    const result = await geocodeLocation(query);
    queryToResult.set(query, result);
    completed++;
    if (onProgress) {
      onProgress(completed, total);
    }
  }

  return queryToResult;
}
