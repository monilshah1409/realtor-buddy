import { describe, it, expect } from 'vitest';
import { calculateMatchScore, sortPropertiesByMatch } from '../scoring';
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
    expect(result.locationScore).toBe(30);
    expect(result.handoverScore).toBe(15);
    expect(result.unitTypeScore).toBe(20);
    expect(result.sizeScore).toBe(10);
    expect(result.budgetScore).toBe(25);
    expect(result.isWithinBudget).toBe(true);
    expect(result.isStretchMatch).toBe(false);
    expect(result.localityTag).toBe('Target Location');
    expect(result.budgetTag).toBe('Within Budget');
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
    expect(result.locationScore).toBe(24);
    expect(result.localityTag).toContain('Nearby Community');
  });

  it('scores other community with lower location score', () => {
    const marinaProp: Property = {
      ...baseProperty,
      id: 'prop-3',
      locality: 'Dubai Marina',
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
    const result = calculateMatchScore(marinaProp, criteria);
    expect(result.locationScore).toBe(8);
    expect(result.localityTag).toBe('Other Community');
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
    expect(result.budgetScore).toBeGreaterThanOrEqual(18);
    expect(result.budgetScore).toBeLessThanOrEqual(22);
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
  });

  it('handles over-budget properties beyond the stretch margin', () => {
    const overBudgetProp: Property = {
      ...baseProperty,
      price_aed: 2200000, // Beyond 1.7M + 15% (1.955M)
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
    const result = calculateMatchScore(overBudgetProp, criteria);
    expect(result.isWithinBudget).toBe(false);
    expect(result.isStretchMatch).toBe(false);
    expect(result.budgetTag).toBe('Over Budget');
    expect(result.budgetScore).toBe(5);
  });

  it('scores handover timeline differences accurately', () => {
    const nearHandoverProp: Property = {
      ...baseProperty,
      handover_status: 'near_handover',
    };
    const offPlanProp: Property = {
      ...baseProperty,
      handover_status: 'newly_launched',
    };
    const criteria: MatchCriteria = {
      preferredHandover: 'ready',
    };

    const nearResult = calculateMatchScore(nearHandoverProp, criteria);
    expect(nearResult.handoverScore).toBe(10);

    const offPlanResult = calculateMatchScore(offPlanProp, criteria);
    expect(offPlanResult.handoverScore).toBe(5);
  });

  it('scores unit type compatibility accurately', () => {
    const twoBhkProp: Property = {
      ...baseProperty,
      property_type: '2bhk',
      bedrooms: 2,
    };
    const villaProp: Property = {
      ...baseProperty,
      property_type: 'villa',
      bedrooms: 4,
    };
    const criteria: MatchCriteria = {
      propertyType: '1bhk',
      bedrooms: 1,
    };

    const compatibleResult = calculateMatchScore(twoBhkProp, criteria);
    expect(compatibleResult.unitTypeScore).toBe(14);

    const incompatibleResult = calculateMatchScore(villaProp, criteria);
    expect(incompatibleResult.unitTypeScore).toBe(5);
  });

  it('scores size / sqft differences accurately', () => {
    const slightlySmallerProp: Property = {
      ...baseProperty,
      area_sqft: 750, // 750 / 800 = 93.75% (within 10%)
    };
    const muchSmallerProp: Property = {
      ...baseProperty,
      area_sqft: 600, // 600 / 800 = 75% (< 90%)
    };
    const criteria: MatchCriteria = {
      minSqft: 800,
    };

    const slightlySmallerResult = calculateMatchScore(slightlySmallerProp, criteria);
    expect(slightlySmallerResult.sizeScore).toBe(7);

    const muchSmallerResult = calculateMatchScore(muchSmallerProp, criteria);
    expect(muchSmallerResult.sizeScore).toBeLessThan(7);
  });

  it('handles empty criteria with maximum score', () => {
    const result = calculateMatchScore(baseProperty, {});
    expect(result.totalScore).toBe(100);
    expect(result.isWithinBudget).toBe(true);
    expect(result.isStretchMatch).toBe(false);
  });

  it('sorts properties by match score descending', () => {
    const exactProp = { ...baseProperty, id: 'exact' };
    const adjacentProp = { ...baseProperty, id: 'adjacent', locality: 'Business Bay' };
    const overBudgetProp = { ...baseProperty, id: 'over-budget', price_aed: 3000000 };

    const criteria: MatchCriteria = {
      targetLocality: 'Downtown Dubai',
      targetBudgetAed: 1700000,
      budgetStretchPercent: 15,
      preferredHandover: 'ready',
    };

    const sorted = sortPropertiesByMatch(
      [overBudgetProp, exactProp, adjacentProp],
      criteria
    );

    expect(sorted.map(p => p.id)).toEqual(['exact', 'adjacent', 'over-budget']);
    expect(sorted[0].score.totalScore).toBeGreaterThanOrEqual(sorted[1].score.totalScore);
    expect(sorted[1].score.totalScore).toBeGreaterThanOrEqual(sorted[2].score.totalScore);
  });
});
