import { DUBAI_CLUSTERS } from '../data/dubaiClusters';
import type {
  Property,
  MatchCriteria,
  MatchScoreResult,
  ScoredProperty,
  PropertyType,
  HandoverStatus,
} from '../types';

const HANDOVER_STAGES: HandoverStatus[] = [
  'ready',
  'near_handover',
  'under_construction',
  'newly_launched',
];

const LOCALITY_ALIASES: Record<string, string> = {
  jlt: 'jumeirah lake towers',
  'jumeirah lake towers': 'jlt',
  jvc: 'jumeirah village circle',
  'jumeirah village circle': 'jvc',
  jvt: 'jumeirah village triangle',
  'jumeirah village triangle': 'jvt',
  'dubai hills': 'dubai hills estate',
  'dubai hills estate': 'dubai hills',
};

const COMPATIBLE_TYPE_PAIRS: [PropertyType, PropertyType][] = [
  ['villa', 'townhouse'],
  ['studio', '1bhk'],
  ['1bhk', '2bhk'],
  ['2bhk', '3bhk'],
  ['3bhk', '4bhk_plus'],
  ['penthouse', '3bhk'],
  ['penthouse', '4bhk_plus'],
];

function normalizeLocality(loc: string): string {
  return loc.trim().toLowerCase();
}

function isSameLocality(locA: string, locB: string): boolean {
  const normA = normalizeLocality(locA);
  const normB = normalizeLocality(locB);
  if (normA === normB) return true;
  if (LOCALITY_ALIASES[normA] === normB || LOCALITY_ALIASES[normB] === normA) return true;
  return false;
}

function areLocalitiesAdjacent(locA: string, locB: string): boolean {
  if (isSameLocality(locA, locB)) return false;

  const checkAdjacency = (source: string, target: string): boolean => {
    const normSource = normalizeLocality(source);
    for (const [clusterKey, adjacents] of Object.entries(DUBAI_CLUSTERS)) {
      const normKey = normalizeLocality(clusterKey);
      if (normKey === normSource || LOCALITY_ALIASES[normKey] === normSource) {
        if (adjacents.some(adj => isSameLocality(adj, target))) {
          return true;
        }
      }
    }
    return false;
  };

  return checkAdjacency(locA, locB) || checkAdjacency(locB, locA);
}

function scoreLocation(
  propertyLocality: string,
  targetLocality?: string
): { locationScore: number; localityTag: string } {
  if (!targetLocality) {
    return {
      locationScore: 30,
      localityTag: 'Target Location',
    };
  }

  if (isSameLocality(propertyLocality, targetLocality)) {
    return {
      locationScore: 30,
      localityTag: 'Target Location',
    };
  }

  if (areLocalitiesAdjacent(propertyLocality, targetLocality)) {
    return {
      locationScore: 24,
      localityTag: 'Nearby Community - 5-10 min',
    };
  }

  return {
    locationScore: 8,
    localityTag: 'Other Community',
  };
}

function scoreHandover(
  propertyStatus: HandoverStatus,
  preferredStatus?: HandoverStatus
): number {
  if (!preferredStatus) return 15;
  if (propertyStatus === preferredStatus) return 15;

  const prefIndex = HANDOVER_STAGES.indexOf(preferredStatus);
  const propIndex = HANDOVER_STAGES.indexOf(propertyStatus);

  if (prefIndex !== -1 && propIndex !== -1) {
    const diff = Math.abs(prefIndex - propIndex);
    if (diff === 1) return 10;
  }

  return 5;
}

function areTypesCompatible(a: PropertyType, b: PropertyType): boolean {
  if (a === b) return true;
  return COMPATIBLE_TYPE_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x)
  );
}

function scoreUnitTypeAndBedrooms(
  propertyType: PropertyType,
  propertyBedrooms: number,
  targetType?: PropertyType,
  targetBedrooms?: number
): number {
  if (!targetType && targetBedrooms === undefined) return 20;

  const isExactType = !targetType || propertyType === targetType;
  const isExactBedrooms = targetBedrooms === undefined || propertyBedrooms === targetBedrooms;

  if (isExactType && isExactBedrooms) return 20;

  const isTypeCompatible = !targetType || areTypesCompatible(propertyType, targetType);
  const isBedroomsCompatible =
    targetBedrooms === undefined ||
    propertyBedrooms === targetBedrooms ||
    Math.abs(propertyBedrooms - targetBedrooms) === 1;

  if (isTypeCompatible && isBedroomsCompatible) return 14;

  return 5;
}

function scoreSize(areaSqft: number, minSqft?: number): number {
  if (!minSqft || minSqft <= 0) return 10;
  if (areaSqft >= minSqft) return 10;
  if (areaSqft >= minSqft * 0.9) return 7;
  return 4;
}

function scoreBudget(
  priceAed: number,
  targetBudgetAed?: number,
  budgetStretchPercent?: number
): {
  budgetScore: number;
  isWithinBudget: boolean;
  isStretchMatch: boolean;
  budgetTag: string;
} {
  if (!targetBudgetAed || targetBudgetAed <= 0) {
    return {
      budgetScore: 25,
      isWithinBudget: true,
      isStretchMatch: false,
      budgetTag: 'Within Budget',
    };
  }

  if (priceAed <= targetBudgetAed) {
    return {
      budgetScore: 25,
      isWithinBudget: true,
      isStretchMatch: false,
      budgetTag: 'Within Budget',
    };
  }

  const stretchPercent = budgetStretchPercent ?? 0;
  const maxStretchBudget = targetBudgetAed * (1 + stretchPercent / 100);

  if (stretchPercent > 0 && priceAed <= maxStretchBudget) {
    const stretchRatio = (priceAed - targetBudgetAed) / (maxStretchBudget - targetBudgetAed);
    const budgetScore = Math.round(22 - 4 * Math.min(Math.max(stretchRatio, 0), 1));

    return {
      budgetScore,
      isWithinBudget: false,
      isStretchMatch: true,
      budgetTag: 'High-Value Stretch',
    };
  }

  return {
    budgetScore: 5,
    isWithinBudget: false,
    isStretchMatch: false,
    budgetTag: 'Over Budget',
  };
}

/**
 * Calculates a comprehensive match score (0-100) for a property against given criteria.
 */
export function calculateMatchScore(
  property: Property,
  criteria: MatchCriteria
): MatchScoreResult {
  const { locationScore, localityTag } = scoreLocation(
    property.locality,
    criteria.targetLocality
  );

  const handoverScore = scoreHandover(
    property.handover_status,
    criteria.preferredHandover
  );

  const unitTypeScore = scoreUnitTypeAndBedrooms(
    property.property_type,
    property.bedrooms,
    criteria.propertyType,
    criteria.bedrooms
  );

  const sizeScore = scoreSize(property.area_sqft, criteria.minSqft);

  const { budgetScore, isWithinBudget, isStretchMatch, budgetTag } = scoreBudget(
    property.price_aed,
    criteria.targetBudgetAed,
    criteria.budgetStretchPercent
  );

  const totalScore = locationScore + handoverScore + unitTypeScore + sizeScore + budgetScore;

  return {
    totalScore,
    locationScore,
    handoverScore,
    unitTypeScore,
    sizeScore,
    budgetScore,
    localityTag,
    budgetTag,
    isWithinBudget,
    isStretchMatch,
  };
}

/**
 * Attaches calculated match scores to properties and sorts them by match score descending.
 */
export function sortPropertiesByMatch(
  properties: Property[],
  criteria: MatchCriteria
): ScoredProperty[] {
  return properties
    .map(property => ({
      ...property,
      score: calculateMatchScore(property, criteria),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore || a.price_aed - b.price_aed);
}
