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
