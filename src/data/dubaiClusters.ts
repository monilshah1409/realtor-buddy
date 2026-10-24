import type { DubaiLocality } from '../types';

export const DUBAI_CLUSTERS: Record<string, string[]> = {
  // Central Core
  'Downtown Dubai': ['Business Bay', 'DIFC', 'City Walk', 'Za\'abeel', 'Satwa'],
  'Business Bay': ['Downtown Dubai', 'DIFC', 'City Walk', 'Al Quoz', 'Al Khail Heights'],
  'DIFC': ['Downtown Dubai', 'Business Bay', 'City Walk', 'Za\'abeel'],
  'City Walk': ['Downtown Dubai', 'Business Bay', 'DIFC', 'Satwa'],
  'Satwa': ['Downtown Dubai', 'DIFC', 'City Walk', 'Za\'abeel'],
  'Za\'abeel': ['DIFC', 'Downtown Dubai', 'Dubai Creek Harbour', 'Sobha Hartland', 'Satwa'],

  // Coastal, Marina & Waterfront
  'Dubai Marina': ['JLT', 'JBR', 'Bluewaters', 'Palm Jumeirah', 'Al Sufouh', 'The Greens & The Views'],
  'JLT': ['Dubai Marina', 'JBR', 'Bluewaters', 'Palm Jumeirah', 'The Meadows'],
  'Jumeirah Lake Towers': ['Dubai Marina', 'JBR', 'Bluewaters', 'Palm Jumeirah'],
  'JBR': ['Dubai Marina', 'JLT', 'Bluewaters', 'Palm Jumeirah'],
  'Bluewaters': ['Dubai Marina', 'JBR', 'JLT', 'Palm Jumeirah'],
  'Palm Jumeirah': ['Dubai Marina', 'JBR', 'Bluewaters', 'JLT', 'Al Sufouh', 'World Islands'],
  'Al Sufouh': ['Dubai Marina', 'Palm Jumeirah', 'Umm Suqeim', 'The Greens & The Views'],
  'Umm Suqeim': ['Al Sufouh', 'Al Quoz', 'Palm Jumeirah'],
  'World Islands': ['Palm Jumeirah', 'Dubai Marina'],
  'The Greens & The Views': ['Dubai Marina', 'JLT', 'Al Sufouh', 'The Springs', 'The Lakes'],
  'The Lakes': ['The Meadows', 'The Springs', 'The Greens & The Views', 'Dubai Marina'],
  'The Meadows': ['The Springs', 'The Lakes', 'JLT', 'JVT'],
  'The Springs': ['The Meadows', 'The Lakes', 'JVC', 'JVT', 'The Greens & The Views'],

  // Villa & Master Planned Communities
  'Dubai Hills Estate': ['Arabian Ranches', 'Meydan', 'Al Barari', 'Al Quoz'],
  'Dubai Hills': ['Arabian Ranches', 'Meydan', 'Al Barari'],
  'Arabian Ranches': ['Dubai Hills Estate', 'Meydan', 'Al Barari', 'Mudon', 'Town Square', 'DAMAC Hills / DAMAC Hills 2'],
  'Meydan': ['Dubai Hills Estate', 'Downtown Dubai', 'Business Bay', 'Al Barari', 'Sobha Hartland', 'Nad Al Sheba'],
  'Sobha Hartland': ['Meydan', 'Downtown Dubai', 'Dubai Creek Harbour', 'Business Bay', 'Nad Al Sheba'],
  'Nad Al Sheba': ['Meydan', 'Sobha Hartland', 'Silicon Oasis (Dubai Silicon Oasis / DSO)'],
  'Al Barari': ['Dubai Hills Estate', 'Arabian Ranches', 'Meydan', 'The Villa'],
  'The Villa': ['Al Barari', 'Silicon Oasis (Dubai Silicon Oasis / DSO)', 'Liwan', 'Villanova'],
  'Villanova': ['The Villa', 'Silicon Oasis (Dubai Silicon Oasis / DSO)', 'Arabian Ranches', 'Liwan'],
  'Town Square': ['Arabian Ranches', 'Mudon', 'Remraam', 'Serena'],
  'Mudon': ['DAMAC Hills / DAMAC Hills 2', 'Remraam', 'Arabian Ranches', 'Town Square', 'Serena'],
  'DAMAC Hills / DAMAC Hills 2': ['Mudon', 'Remraam', 'Arabian Ranches', 'Town Square'],
  'Remraam': ['Mudon', 'DAMAC Hills / DAMAC Hills 2', 'Town Square', 'Serena'],
  'Serena': ['Mudon', 'Town Square', 'Remraam', 'Arabian Ranches'],

  // Emerging & Value Hubs
  'JVC': ['JVT', 'Arjan', 'Motor City', 'Dubai Sports City', 'Production City (IMPZ)', 'Dubai Production City'],
  'Jumeirah Village Circle': ['JVT', 'Arjan', 'Motor City', 'Dubai Sports City'],
  'JVT': ['JVC', 'Arjan', 'Motor City', 'Dubai Sports City', 'The Springs', 'The Meadows'],
  'Jumeirah Village Triangle': ['JVC', 'Arjan', 'Motor City', 'Dubai Sports City'],
  'Arjan': ['JVC', 'JVT', 'Motor City', 'Dubai Sports City', 'Dubai Science Park'],
  'Dubai Science Park': ['Arjan', 'Motor City', 'JVC'],
  'Motor City': ['JVC', 'JVT', 'Arjan', 'Dubai Sports City', 'Dubai Science Park', 'Arabian Ranches'],
  'Dubai Sports City': ['JVC', 'JVT', 'Arjan', 'Motor City', 'Production City (IMPZ)', 'Dubai Production City'],
  'Production City (IMPZ)': ['JVC', 'Dubai Sports City', 'Al Furjan', 'JVT'],
  'Dubai Production City': ['JVC', 'Dubai Sports City', 'Al Furjan', 'JVT'],

  // South West Corridors & South Gateways
  'Al Furjan': ['Discovery Gardens', 'JVC', 'Dubai South', 'Production City (IMPZ)', 'JLT'],
  'Discovery Gardens': ['Al Furjan', 'JLT', 'Dubai Marina'],
  'Dubai South': ['Dubai Waterfront', 'Al Furjan'],
  'Dubai Waterfront': ['Dubai South', 'Palm Jumeirah'],

  // Tech & Central Corridors
  'Silicon Oasis (Dubai Silicon Oasis / DSO)': ['Liwan', 'Nad Al Sheba', 'The Villa', 'Villanova'],
  'Liwan': ['Silicon Oasis (Dubai Silicon Oasis / DSO)', 'The Villa', 'Villanova'],
  'Al Quoz': ['Al Khail Heights', 'Business Bay', 'Al Sufouh', 'Umm Suqeim', 'Dubai Hills Estate'],
  'Al Khail Heights': ['Al Quoz', 'Business Bay', 'Downtown Dubai'],

  // Creek & Historic
  'Dubai Creek Harbour': ['Festival City', 'Culture Village', 'Sobha Hartland', 'Za\'abeel'],
  'Festival City': ['Dubai Creek Harbour', 'Culture Village'],
  'Culture Village': ['Dubai Creek Harbour', 'Festival City'],
};

export const DUBAI_LOCALITIES: DubaiLocality[] = [
  // 1. Central Core
  {
    name: 'Downtown Dubai',
    cluster: 'Central Core',
    adjacentLocalities: ['Business Bay', 'DIFC', 'City Walk', 'Za\'abeel', 'Satwa'],
    coordinates: { latitude: 25.1972, longitude: 55.2744 },
  },
  {
    name: 'Business Bay',
    cluster: 'Central Core',
    adjacentLocalities: ['Downtown Dubai', 'DIFC', 'City Walk', 'Al Quoz', 'Al Khail Heights'],
    coordinates: { latitude: 25.1857, longitude: 55.2678 },
  },
  {
    name: 'DIFC',
    cluster: 'Central Core',
    adjacentLocalities: ['Downtown Dubai', 'Business Bay', 'City Walk', 'Za\'abeel'],
    coordinates: { latitude: 25.2114, longitude: 55.2811 },
  },
  {
    name: 'City Walk',
    cluster: 'Central Core',
    adjacentLocalities: ['Downtown Dubai', 'Business Bay', 'DIFC', 'Satwa'],
    coordinates: { latitude: 25.2078, longitude: 55.2632 },
  },
  {
    name: 'Satwa',
    cluster: 'Central Core',
    adjacentLocalities: ['Downtown Dubai', 'DIFC', 'City Walk', 'Za\'abeel'],
    coordinates: { latitude: 25.2185, longitude: 55.2678 },
  },
  {
    name: 'Za\'abeel',
    cluster: 'Central Core',
    adjacentLocalities: ['DIFC', 'Downtown Dubai', 'Dubai Creek Harbour', 'Sobha Hartland', 'Satwa'],
    coordinates: { latitude: 25.2289, longitude: 55.2954 },
  },

  // 2. Coastal & Marina
  {
    name: 'Dubai Marina',
    cluster: 'Coastal & Marina',
    adjacentLocalities: ['JLT', 'JBR', 'Bluewaters', 'Palm Jumeirah', 'Al Sufouh', 'The Greens & The Views'],
    coordinates: { latitude: 25.0805, longitude: 55.1403 },
  },
  {
    name: 'JLT',
    cluster: 'Coastal & Marina',
    adjacentLocalities: ['Dubai Marina', 'JBR', 'Bluewaters', 'Palm Jumeirah', 'The Meadows'],
    coordinates: { latitude: 25.0712, longitude: 55.1489 },
  },
  {
    name: 'Palm Jumeirah',
    cluster: 'Coastal & Marina',
    adjacentLocalities: ['Dubai Marina', 'JBR', 'Bluewaters', 'JLT', 'Al Sufouh', 'World Islands'],
    coordinates: { latitude: 25.1124, longitude: 55.1390 },
  },
  {
    name: 'Al Sufouh',
    cluster: 'Coastal & Luxury Corridors',
    adjacentLocalities: ['Dubai Marina', 'Palm Jumeirah', 'Umm Suqeim', 'The Greens & The Views'],
    coordinates: { latitude: 25.1118, longitude: 55.1782 },
  },
  {
    name: 'Umm Suqeim',
    cluster: 'Coastal & Luxury Corridors',
    adjacentLocalities: ['Al Sufouh', 'Al Quoz', 'Palm Jumeirah'],
    coordinates: { latitude: 25.1489, longitude: 55.2012 },
  },
  {
    name: 'World Islands',
    cluster: 'Coastal & Offshore Luxury',
    adjacentLocalities: ['Palm Jumeirah', 'Dubai Marina'],
    coordinates: { latitude: 25.2250, longitude: 55.1650 },
  },

  // 3. Emaar Communities (The Greens, Views, Lakes, Meadows, Springs)
  {
    name: 'The Greens & The Views',
    cluster: 'Coastal, Marina & Suburban',
    adjacentLocalities: ['Dubai Marina', 'JLT', 'Al Sufouh', 'The Springs', 'The Lakes'],
    coordinates: { latitude: 25.0975, longitude: 55.1702 },
  },
  {
    name: 'The Lakes',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['The Meadows', 'The Springs', 'The Greens & The Views', 'Dubai Marina'],
    coordinates: { latitude: 25.0782, longitude: 55.1634 },
  },
  {
    name: 'The Meadows',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['The Springs', 'The Lakes', 'JLT', 'JVT'],
    coordinates: { latitude: 25.0682, longitude: 55.1589 },
  },
  {
    name: 'The Springs',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['The Meadows', 'The Lakes', 'JVC', 'JVT', 'The Greens & The Views'],
    coordinates: { latitude: 25.0592, longitude: 55.1742 },
  },

  // 4. Villa & Master Communities
  {
    name: 'Dubai Hills Estate',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Arabian Ranches', 'Meydan', 'Al Barari', 'Al Quoz'],
    coordinates: { latitude: 25.1112, longitude: 55.2608 },
  },
  {
    name: 'Arabian Ranches',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Dubai Hills Estate', 'Meydan', 'Al Barari', 'Mudon', 'Town Square', 'DAMAC Hills / DAMAC Hills 2'],
    coordinates: { latitude: 25.0558, longitude: 55.2711 },
  },
  {
    name: 'Meydan',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Dubai Hills Estate', 'Downtown Dubai', 'Business Bay', 'Al Barari', 'Sobha Hartland', 'Nad Al Sheba'],
    coordinates: { latitude: 25.1589, longitude: 55.3021 },
  },
  {
    name: 'Sobha Hartland',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Meydan', 'Downtown Dubai', 'Dubai Creek Harbour', 'Business Bay', 'Nad Al Sheba'],
    coordinates: { latitude: 25.1782, longitude: 55.3115 },
  },
  {
    name: 'Nad Al Sheba',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Meydan', 'Sobha Hartland', 'Silicon Oasis (Dubai Silicon Oasis / DSO)'],
    coordinates: { latitude: 25.1520, longitude: 55.3410 },
  },
  {
    name: 'Al Barari',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Dubai Hills Estate', 'Arabian Ranches', 'Meydan', 'The Villa'],
    coordinates: { latitude: 25.0978, longitude: 55.3142 },
  },
  {
    name: 'The Villa',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Al Barari', 'Silicon Oasis (Dubai Silicon Oasis / DSO)', 'Liwan', 'Villanova'],
    coordinates: { latitude: 25.0920, longitude: 55.3650 },
  },
  {
    name: 'Villanova',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['The Villa', 'Silicon Oasis (Dubai Silicon Oasis / DSO)', 'Arabian Ranches', 'Liwan'],
    coordinates: { latitude: 25.0750, longitude: 55.3520 },
  },
  {
    name: 'DAMAC Hills / DAMAC Hills 2',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Mudon', 'Remraam', 'Arabian Ranches', 'Town Square'],
    coordinates: { latitude: 25.0185, longitude: 55.2472 },
  },
  {
    name: 'Mudon',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['DAMAC Hills / DAMAC Hills 2', 'Remraam', 'Arabian Ranches', 'Town Square', 'Serena'],
    coordinates: { latitude: 25.0210, longitude: 55.2580 },
  },
  {
    name: 'Remraam',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Mudon', 'DAMAC Hills / DAMAC Hills 2', 'Town Square', 'Serena'],
    coordinates: { latitude: 25.0089, longitude: 55.2410 },
  },
  {
    name: 'Town Square',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Arabian Ranches', 'Mudon', 'Remraam', 'Serena'],
    coordinates: { latitude: 25.0042, longitude: 55.2789 },
  },
  {
    name: 'Serena',
    cluster: 'Villa & Family Communities',
    adjacentLocalities: ['Mudon', 'Town Square', 'Remraam', 'Arabian Ranches'],
    coordinates: { latitude: 25.0112, longitude: 55.2650 },
  },

  // 5. Emerging & Value Hubs
  {
    name: 'JVC',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVT', 'Arjan', 'Motor City', 'Dubai Sports City', 'Production City (IMPZ)', 'Dubai Production City'],
    coordinates: { latitude: 25.0601, longitude: 55.2078 },
  },
  {
    name: 'JVT',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVC', 'Arjan', 'Motor City', 'Dubai Sports City', 'The Springs', 'The Meadows'],
    coordinates: { latitude: 25.0489, longitude: 55.1956 },
  },
  {
    name: 'Arjan',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVC', 'JVT', 'Motor City', 'Dubai Sports City', 'Dubai Science Park'],
    coordinates: { latitude: 25.0667, longitude: 55.2372 },
  },
  {
    name: 'Dubai Science Park',
    cluster: 'Tech & Knowledge Corridors',
    adjacentLocalities: ['Arjan', 'Motor City', 'JVC'],
    coordinates: { latitude: 25.0754, longitude: 55.2415 },
  },
  {
    name: 'Motor City',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVC', 'JVT', 'Arjan', 'Dubai Sports City', 'Dubai Science Park', 'Arabian Ranches'],
    coordinates: { latitude: 25.0485, longitude: 55.2398 },
  },
  {
    name: 'Dubai Sports City',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVC', 'JVT', 'Arjan', 'Motor City', 'Production City (IMPZ)', 'Dubai Production City'],
    coordinates: { latitude: 25.0412, longitude: 55.2198 },
  },
  {
    name: 'Production City (IMPZ)',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVC', 'Dubai Sports City', 'Al Furjan', 'JVT'],
    coordinates: { latitude: 25.0315, longitude: 55.1852 },
  },
  {
    name: 'Dubai Production City',
    cluster: 'Emerging & Value Hubs',
    adjacentLocalities: ['JVC', 'Dubai Sports City', 'Al Furjan', 'JVT'],
    coordinates: { latitude: 25.0315, longitude: 55.1852 },
  },

  // 6. South West & South Gateways
  {
    name: 'Al Furjan',
    cluster: 'South West Corridors',
    adjacentLocalities: ['Discovery Gardens', 'JVC', 'Dubai South', 'Production City (IMPZ)', 'JLT'],
    coordinates: { latitude: 25.0234, longitude: 55.1458 },
  },
  {
    name: 'Discovery Gardens',
    cluster: 'South West Corridors',
    adjacentLocalities: ['Al Furjan', 'JLT', 'Dubai Marina'],
    coordinates: { latitude: 25.0389, longitude: 55.1389 },
  },
  {
    name: 'Dubai South',
    cluster: 'Expo & South Gateways',
    adjacentLocalities: ['Dubai Waterfront', 'Al Furjan'],
    coordinates: { latitude: 24.8988, longitude: 55.1623 },
  },
  {
    name: 'Dubai Waterfront',
    cluster: 'Expo & South Gateways',
    adjacentLocalities: ['Dubai South', 'Palm Jumeirah'],
    coordinates: { latitude: 24.9355, longitude: 55.0564 },
  },

  // 7. Tech & Knowledge Corridors
  {
    name: 'Silicon Oasis (Dubai Silicon Oasis / DSO)',
    cluster: 'Tech & Knowledge Corridors',
    adjacentLocalities: ['Liwan', 'Nad Al Sheba', 'The Villa', 'Villanova'],
    coordinates: { latitude: 25.1275, longitude: 55.3813 },
  },
  {
    name: 'Liwan',
    cluster: 'Tech & Knowledge Corridors',
    adjacentLocalities: ['Silicon Oasis (Dubai Silicon Oasis / DSO)', 'The Villa', 'Villanova'],
    coordinates: { latitude: 25.1198, longitude: 55.3789 },
  },

  // 8. Al Quoz & Central
  {
    name: 'Al Quoz',
    cluster: 'Al Quoz & Central',
    adjacentLocalities: ['Al Khail Heights', 'Business Bay', 'Al Sufouh', 'Umm Suqeim', 'Dubai Hills Estate'],
    coordinates: { latitude: 25.1485, longitude: 55.2345 },
  },
  {
    name: 'Al Khail Heights',
    cluster: 'Al Quoz & Central',
    adjacentLocalities: ['Al Quoz', 'Business Bay', 'Downtown Dubai'],
    coordinates: { latitude: 25.1558, longitude: 55.2498 },
  },

  // 9. Creek & Historic
  {
    name: 'Dubai Creek Harbour',
    cluster: 'Creek & Historic',
    adjacentLocalities: ['Festival City', 'Culture Village', 'Sobha Hartland', 'Za\'abeel'],
    coordinates: { latitude: 25.2018, longitude: 55.3524 },
  },
];
