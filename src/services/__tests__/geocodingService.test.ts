import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  buildSearchQuery,
  geocodeLocation,
  batchGeocodeRows,
  clearGeocodeCache,
  type GeocodingResult,
} from '../geocodingService';

describe('geocodingService', () => {
  beforeEach(() => {
    clearGeocodeCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('buildSearchQuery', () => {
    it('prioritizes building name if present along with project', () => {
      const q = buildSearchQuery('Emaar Beachfront', 'Marina Vista Tower 1');
      expect(q).toContain('Marina Vista Tower 1');
      expect(q).toContain('Dubai');
    });

    it('uses project name when building is empty or identical', () => {
      const q1 = buildSearchQuery('Burj Crown', '');
      expect(q1).toContain('Burj Crown');
      expect(q1).toContain('Dubai');

      const q2 = buildSearchQuery('Downtown Views II', 'Downtown Views II');
      expect(q2).toBe('Downtown Views II, Dubai, United Arab Emirates');
    });

    it('falls back to general Dubai query if both are empty', () => {
      const q = buildSearchQuery('', '');
      expect(q).toBe('Dubai, United Arab Emirates');
    });
  });

  describe('geocodeLocation', () => {
    it('returns GeocodingResult with coordinates and locality on successful response', async () => {
      const mockOsmResponse = [
        {
          lat: '25.1972',
          lon: '55.2744',
          display_name: 'Burj Crown, Downtown Dubai, Dubai, United Arab Emirates',
          address: {
            building: 'Burj Crown',
            suburb: 'Downtown Dubai',
            city: 'Dubai',
            country: 'United Arab Emirates',
          },
        },
      ];

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockOsmResponse,
        })
      );

      const result = await geocodeLocation('Burj Crown, Dubai, United Arab Emirates');
      expect(result).not.toBeNull();
      expect(result?.found).toBe(true);
      expect(result?.latitude).toBeCloseTo(25.1972);
      expect(result?.longitude).toBeCloseTo(55.2744);
      expect(result?.locality).toBe('Downtown Dubai');
      expect(result?.displayName).toContain('Burj Crown');
    });

    it('returns null when Nominatim finds no results', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [],
        })
      );

      const result = await geocodeLocation('NonExistentBuildingXYZ123, Dubai, UAE');
      expect(result).toBeNull();
    });

    it('handles network error gracefully and returns null', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Network offline'))
      );

      const result = await geocodeLocation('Burj Khalifa, Dubai, UAE');
      expect(result).toBeNull();
    });

    it('handles non-200 HTTP status gracefully', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      );

      const result = await geocodeLocation('Burj Khalifa, Dubai, UAE');
      expect(result).toBeNull();
    });
  });

  describe('batchGeocodeRows with caching and deduplication', () => {
    it('deduplicates identical property queries so fetch is called only once per unique property', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '25.0805',
            lon: '55.1403',
            display_name: 'Marina Gate 1, Dubai Marina, Dubai, UAE',
            address: { suburb: 'Dubai Marina', city: 'Dubai' },
          },
        ],
      });
      vi.stubGlobal('fetch', mockFetch);

      const rows = [
        { project: 'Marina Gate', building: 'Tower 1' },
        { project: 'Marina Gate', building: 'Tower 1' }, // duplicate
        { project: 'Marina Gate', building: 'Tower 1' }, // duplicate
      ];

      const resultMap = await batchGeocodeRows(rows, vi.fn());
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const queryKey = buildSearchQuery('Marina Gate', 'Tower 1');
      const item = resultMap.get(queryKey);
      expect(item).toBeDefined();
      expect(item?.latitude).toBeCloseTo(25.0805);
      expect(item?.locality).toBe('Dubai Marina');
    });

    it('calls onProgress callback as items are resolved', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => [
            {
              lat: '25.10',
              lon: '55.15',
              display_name: 'Property, Dubai',
              address: { city: 'Dubai' },
            },
          ],
        })
      );

      const onProgress = vi.fn();
      const rows = [
        { project: 'Project A', building: 'Tower A' },
        { project: 'Project B', building: 'Tower B' },
      ];

      await batchGeocodeRows(rows, onProgress);
      expect(onProgress).toHaveBeenCalled();
    });
  });
});
