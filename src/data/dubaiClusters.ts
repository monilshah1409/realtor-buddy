import type { DubaiLocality } from '../types';

export const DUBAI_CLUSTERS: Record<string, string[]> = {
  'Downtown Dubai': ['Business Bay', 'DIFC', 'City Walk'],
  'Business Bay': ['Downtown Dubai', 'DIFC', 'City Walk'],
  'DIFC': ['Downtown Dubai', 'Business Bay', 'City Walk'],
  'City Walk': ['Downtown Dubai', 'Business Bay', 'DIFC'],

  'Dubai Marina': ['JLT', 'JBR', 'Bluewaters', 'Palm Jumeirah'],
  'JLT': ['Dubai Marina', 'JBR', 'Bluewaters', 'Palm Jumeirah'],
  'Jumeirah Lake Towers': ['Dubai Marina', 'JBR', 'Bluewaters', 'Palm Jumeirah'],
  'JBR': ['Dubai Marina', 'JLT', 'Bluewaters', 'Palm Jumeirah'],
  'Bluewaters': ['Dubai Marina', 'JBR', 'JLT', 'Palm Jumeirah'],
  'Palm Jumeirah': ['Dubai Marina', 'JBR', 'Bluewaters', 'JLT'],

  'Dubai Hills Estate': ['Arabian Ranches', 'Meydan', 'Al Barari'],
  'Dubai Hills': ['Arabian Ranches', 'Meydan', 'Al Barari'],
  'Arabian Ranches': ['Dubai Hills Estate', 'Meydan', 'Al Barari'],
  'Meydan': ['Dubai Hills Estate', 'Downtown Dubai', 'Business Bay', 'Al Barari'],
  'Al Barari': ['Dubai Hills Estate', 'Arabian Ranches', 'Meydan'],

  'JVC': ['JVT', 'Arjan', 'Motor City', 'Dubai Sports City'],
  'Jumeirah Village Circle': ['JVT', 'Arjan', 'Motor City', 'Dubai Sports City'],
  'JVT': ['JVC', 'Arjan', 'Motor City', 'Dubai Sports City'],
  'Jumeirah Village Triangle': ['JVC', 'Arjan', 'Motor City', 'Dubai Sports City'],
  'Arjan': ['JVC', 'JVT', 'Motor City', 'Dubai Sports City'],
  'Motor City': ['JVC', 'JVT', 'Arjan', 'Dubai Sports City'],
  'Dubai Sports City': ['JVC', 'JVT', 'Arjan', 'Motor City'],

  'Dubai Creek Harbour': ['Festival City', 'Culture Village'],
  'Festival City': ['Dubai Creek Harbour', 'Culture Village'],
  'Culture Village': ['Dubai Creek Harbour', 'Festival City'],
};

export const DUBAI_LOCALITIES: DubaiLocality[] = [
  {
    name: 'Downtown Dubai',
    cluster: 'Central Core',
    adjacentLocalities: ['Business Bay', 'DIFC', 'City Walk'],
    coordinates: { latitude: 25.1972, longitude: 55.2744 },
  },
  {
    name: 'Business Bay',
    cluster: 'Central Core',
    adjacentLocalities: ['Downtown Dubai', 'DIFC', 'City Walk'],
    coordinates: { latitude: 25.1857, longitude: 55.2678 },
  },
  {
    name: 'DIFC',
    cluster: 'Central Core',
    adjacentLocalities: ['Downtown Dubai', 'Business Bay', 'City Walk'],
    coordinates: { latitude: 25.2114, longitude: 55.2811 },
  },
  {
    name: 'Dubai Marina',
    cluster: 'Coastal & Marina',
    adjacentLocalities: ['JLT', 'JBR', 'Bluewaters', 'Palm Jumeirah'],
    coordinates: { latitude: 25.0805, longitude: 55.1403 },
  },
  {
    name: 'JLT',
    cluster: 'Coastal & Marina',
    adjacentLocalities: ['Dubai Marina', 'JBR', 'Bluewaters', 'Palm Jumeirah'],
    coordinates: { latitude: 25.0712, longitude: 55.1489 },
  },
  {
    name: 'Palm Jumeirah',
    cluster: 'Coastal & Marina',
    adjacentLocalities: ['Dubai Marina', 'JBR', 'Bluewaters', 'JLT'],
    coordinates: { latitude: 25.1124, longitude: 55.1390 },
  },
  {
    name: 'Dubai Hills Estate',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Arabian Ranches', 'Meydan', 'Al Barari'],
    coordinates: { latitude: 25.1112, longitude: 55.2608 },
  },
  {
    name: 'JVC',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVT', 'Arjan', 'Motor City', 'Dubai Sports City'],
    coordinates: { latitude: 25.0601, longitude: 55.2078 },
  },
  {
    name: 'Dubai Creek Harbour',
    cluster: 'Creek & Historic',
    adjacentLocalities: ['Festival City', 'Culture Village'],
    coordinates: { latitude: 25.2018, longitude: 55.3524 },
  },
];
