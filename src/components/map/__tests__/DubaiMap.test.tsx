import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DubaiMap, { DUBAI_CENTER, DEFAULT_ZOOM } from '../DubaiMap';
import {
  getMarkerTier,
  TIER_CONFIGS,
  createCustomMarkerIcon,
  MapMarker,
  type MarkerMatchTier,
} from '../MapMarker';
import { mockProperties } from '../../../data/mockProperties';
import type { Property, MatchScoreResult } from '../../../types';

describe('DubaiMap Component', () => {
  const highMatchScore: MatchScoreResult = {
    totalScore: 92,
    localityTag: 'Target Location',
    isStretchMatch: false,
    isWithinBudget: true,
    budgetTag: 'Within Budget',
  };

  const nearbyMatchScore: MatchScoreResult = {
    totalScore: 84,
    localityTag: 'Nearby Community - 5-10 min',
    isStretchMatch: false,
    isWithinBudget: true,
    budgetTag: 'Within Budget',
  };

  const stretchMatchScore: MatchScoreResult = {
    totalScore: 82,
    localityTag: 'Target Location',
    isStretchMatch: true,
    isWithinBudget: false,
    budgetTag: 'High-Value Stretch',
  };

  const otherScore: MatchScoreResult = {
    totalScore: 60,
    localityTag: 'Other Community',
    isStretchMatch: false,
    isWithinBudget: true,
    budgetTag: 'Within Budget',
  };

  it('renders the map container with Dubai center coordinates', () => {
    const { container } = render(
      <DubaiMap 
        properties={mockProperties.map(p => ({ ...p, score: highMatchScore }))} 
        onSelectProperty={() => {}} 
      />
    );
    expect(container.querySelector('.leaflet-container')).toBeTruthy();
    expect(screen.getByTestId('dubai-map-wrapper')).toBeInTheDocument();
    expect(DUBAI_CENTER).toEqual([25.2048, 55.2708]);
    expect(DEFAULT_ZOOM).toBe(11);
  });

  it('renders custom markers for properties with correct tier colors and attributes', () => {
    const { container } = render(
      <DubaiMap 
        properties={[
          { ...mockProperties[0], score: highMatchScore },
          { ...mockProperties[1], score: nearbyMatchScore },
          { ...mockProperties[2], score: stretchMatchScore },
          { ...mockProperties[3], score: otherScore },
        ]} 
        onSelectProperty={() => {}} 
      />
    );

    const markerPins = container.querySelectorAll('[data-testid="map-marker-pin"]');
    expect(markerPins.length).toBe(4);

    // High Match (Emerald)
    expect(markerPins[0].getAttribute('data-tier')).toBe('high');
    expect(markerPins[0].getAttribute('data-color')).toBe(TIER_CONFIGS.high.pinColor);
    expect(markerPins[0].textContent).toContain('92');

    // Nearby Community (Sky Blue)
    expect(markerPins[1].getAttribute('data-tier')).toBe('nearby');
    expect(markerPins[1].getAttribute('data-color')).toBe(TIER_CONFIGS.nearby.pinColor);
    expect(markerPins[1].textContent).toContain('84');

    // Stretch Match (Amber)
    expect(markerPins[2].getAttribute('data-tier')).toBe('stretch');
    expect(markerPins[2].getAttribute('data-color')).toBe(TIER_CONFIGS.stretch.pinColor);
    expect(markerPins[2].textContent).toContain('82');

    // Other (Slate)
    expect(markerPins[3].getAttribute('data-tier')).toBe('other');
    expect(markerPins[3].getAttribute('data-color')).toBe(TIER_CONFIGS.other.pinColor);
    expect(markerPins[3].textContent).toContain('60');
  });

  it('indicates selection on the marker when selectedPropertyId is provided', () => {
    const { container } = render(
      <DubaiMap 
        properties={[
          { ...mockProperties[0], score: highMatchScore },
          { ...mockProperties[1], score: nearbyMatchScore },
        ]}
        selectedPropertyId={mockProperties[0].id}
        onSelectProperty={() => {}} 
      />
    );

    const markerPins = container.querySelectorAll('[data-testid="map-marker-pin"]');
    expect(markerPins[0].getAttribute('data-selected')).toBe('true');
    expect(markerPins[1].getAttribute('data-selected')).toBe('false');
  });

  it('invokes onSelectProperty when marker icon is clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <DubaiMap 
        properties={[{ ...mockProperties[0], score: highMatchScore }]} 
        onSelectProperty={handleSelect} 
      />
    );

    const markerIcon = container.querySelector('.leaflet-marker-icon');
    expect(markerIcon).toBeTruthy();
    fireEvent.click(markerIcon!);

    expect(handleSelect).toHaveBeenCalledWith(mockProperties[0].id);
  });

  it('renders the interactive popup showing property details when marker is clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <DubaiMap 
        properties={[{ ...mockProperties[0], score: highMatchScore }]} 
        onSelectProperty={handleSelect} 
      />
    );

    const markerIcon = container.querySelector('.leaflet-marker-icon');
    fireEvent.click(markerIcon!);

    // Popup content
    expect(screen.getByTestId(`popup-${mockProperties[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId('popup-title')).toHaveTextContent(mockProperties[0].title);
    expect(screen.getByTestId('popup-locality')).toHaveTextContent(mockProperties[0].locality);
    expect(screen.getByTestId('popup-price')).toHaveTextContent('AED 1,600,000');
    expect(screen.getByTestId('popup-handover')).toHaveTextContent(mockProperties[0].handover_date);
    expect(screen.getByTestId('popup-score-badge')).toHaveTextContent('92% Match');
    expect(screen.getByTestId('popup-tier-badge')).toHaveTextContent('High Match');

    // Click select button inside popup
    const selectBtn = screen.getByTestId('popup-select-btn');
    fireEvent.click(selectBtn);
    expect(handleSelect).toHaveBeenCalledWith(mockProperties[0].id);
  });

  it('renders map legend with all four match tiers', () => {
    render(
      <DubaiMap 
        properties={[]} 
        showLegend={true} 
      />
    );

    expect(screen.getByTestId('map-legend')).toBeInTheDocument();
    expect(screen.getByTestId('legend-high')).toHaveTextContent('High Match');
    expect(screen.getByTestId('legend-nearby')).toHaveTextContent('Nearby Community');
    expect(screen.getByTestId('legend-stretch')).toHaveTextContent('High-Value Stretch');
    expect(screen.getByTestId('legend-other')).toHaveTextContent('Other');
  });

  it('can hide map legend when showLegend is false', () => {
    render(
      <DubaiMap 
        properties={[]} 
        showLegend={false} 
      />
    );

    expect(screen.queryByTestId('map-legend')).not.toBeInTheDocument();
  });

  it('safely filters out properties with invalid or missing coordinates', () => {
    const invalidProps: Property[] = [
      {
        ...mockProperties[0],
        id: 'invalid-1',
        latitude: NaN,
        longitude: 55.2,
      },
      {
        ...mockProperties[1],
        id: 'invalid-2',
        latitude: 25.1,
        longitude: undefined as unknown as number,
      },
    ];

    const { container } = render(
      <DubaiMap properties={invalidProps} />
    );

    const markerPins = container.querySelectorAll('[data-testid="map-marker-pin"]');
    expect(markerPins.length).toBe(0);
  });
});

describe('MapMarker Tier Classification and Icon Generation', () => {
  it('correctly classifies High Match for score >= 85 without stretch or nearby', () => {
    const score: MatchScoreResult = {
      totalScore: 90,
      localityTag: 'Target Location',
      isStretchMatch: false,
      isWithinBudget: true,
      budgetTag: 'Within Budget',
    };
    expect(getMarkerTier(score)).toBe('high');
  });

  it('correctly classifies Nearby Community Match when localityTag indicates nearby/adjacent', () => {
    const score: MatchScoreResult = {
      totalScore: 88,
      localityTag: 'Nearby Community - 5-10 min',
      isStretchMatch: false,
      isWithinBudget: true,
      budgetTag: 'Within Budget',
    };
    expect(getMarkerTier(score)).toBe('nearby');
  });

  it('correctly classifies High-Value Stretch Match when isStretchMatch is true', () => {
    const score: MatchScoreResult = {
      totalScore: 86,
      localityTag: 'Target Location',
      isStretchMatch: true,
      isWithinBudget: false,
      budgetTag: 'High-Value Stretch',
    };
    expect(getMarkerTier(score)).toBe('stretch');
  });

  it('correctly classifies Other for low scores or undefined score', () => {
    const lowScore: MatchScoreResult = {
      totalScore: 65,
      localityTag: 'Other Community',
      isStretchMatch: false,
      isWithinBudget: true,
      budgetTag: 'Within Budget',
    };
    expect(getMarkerTier(lowScore)).toBe('other');
    expect(getMarkerTier(undefined)).toBe('other');
  });

  it('generates Leaflet DivIcon with proper SVG, colors and dimensions', () => {
    const normalIcon = createCustomMarkerIcon('high', false, 95);
    expect(normalIcon.options.className).toBe('custom-div-icon');
    expect(normalIcon.options.html).toContain(TIER_CONFIGS.high.pinColor);
    expect(normalIcon.options.html).toContain('95');
    expect(normalIcon.options.iconSize).toEqual([34, 42]);

    const selectedIcon = createCustomMarkerIcon('stretch', true, 80);
    expect(selectedIcon.options.html).toContain(TIER_CONFIGS.stretch.pinColor);
    expect(selectedIcon.options.html).toContain('marker-selected');
    expect(selectedIcon.options.iconSize).toEqual([40, 48]);
  });
});
