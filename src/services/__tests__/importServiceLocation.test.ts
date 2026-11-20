import { describe, it, expect } from 'vitest';
import { importedRowToProperty, type ImportedRow } from '../importService';
import type { GeocodingResult } from '../geocodingService';

describe('importedRowToProperty location mapping', () => {
  const baseRow: ImportedRow = {
    project: 'Emaar Beachfront',
    building: 'Marina Vista',
    unitNo: '1204',
    unitView: 'Sea View',
    bedrooms: '2 Bedrooms',
    totalAreaSqft: 1150,
    priceAed: 2800000,
    currency: 'AED',
    valid: true,
  };

  it('uses resolved coordinates and locality when location is found', () => {
    const location: GeocodingResult = {
      latitude: 25.0911,
      longitude: 55.1432,
      locality: 'Dubai Harbour',
      displayName: 'Marina Vista, Dubai Harbour, Dubai',
      found: true,
    };

    const rowWithLoc: ImportedRow = {
      ...baseRow,
      location,
      locationStatus: 'found',
    };

    const prop = importedRowToProperty(rowWithLoc, 'test-user-1');
    expect(prop.latitude).toBe(25.0911);
    expect(prop.longitude).toBe(55.1432);
    expect(prop.locality).toBe('Dubai Harbour');
  });

  it('falls back to default Dubai center coordinates when location is not found', () => {
    const rowWithoutLoc: ImportedRow = {
      ...baseRow,
      location: null,
      locationStatus: 'not_found',
    };

    const prop = importedRowToProperty(rowWithoutLoc, 'test-user-1');
    expect(prop.latitude).toBe(25.2048);
    expect(prop.longitude).toBe(55.2708);
    expect(prop.locality).toBe('Dubai');
  });

  it('handles empty building or project cleanly with location', () => {
    const rowNoBuilding: ImportedRow = {
      ...baseRow,
      building: '',
      location: {
        latitude: 25.1972,
        longitude: 55.2744,
        locality: 'Downtown Dubai',
        displayName: 'Burj Crown, Downtown Dubai',
        found: true,
      },
    };

    const prop = importedRowToProperty(rowNoBuilding, 'test-user-1');
    expect(prop.latitude).toBe(25.1972);
    expect(prop.longitude).toBe(55.2744);
    expect(prop.locality).toBe('Downtown Dubai');
  });
});
