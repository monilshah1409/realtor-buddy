import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property, MatchScoreResult } from '../../types';
import { MapMarker, TIER_CONFIGS, type MarkerMatchTier } from './MapMarker';

export const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];
export const DEFAULT_ZOOM = 11;

export interface DubaiMapProps {
  properties: (Property & { score?: MatchScoreResult })[];
  selectedPropertyId?: string;
  onSelectProperty?: (id: string) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
  showLegend?: boolean;
}

/**
 * Controller to smoothly center map when selectedProperty changes
 */
const MapCenterController: React.FC<{
  selectedProperty?: Property & { score?: MatchScoreResult };
}> = ({ selectedProperty }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedProperty && typeof selectedProperty.latitude === 'number' && typeof selectedProperty.longitude === 'number') {
      try {
        map.setView([selectedProperty.latitude, selectedProperty.longitude], 13, {
          animate: true,
        });
      } catch {
        // Safe in test environments
      }
    }
  }, [selectedProperty, map]);

  return null;
};

export const DubaiMap: React.FC<DubaiMapProps> = ({
  properties = [],
  selectedPropertyId,
  onSelectProperty,
  className = '',
  center = DUBAI_CENTER,
  zoom = DEFAULT_ZOOM,
  showLegend = true,
}) => {
  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  // Filter valid coordinate properties
  const validProperties = useMemo(() => {
    return properties.filter(
      p =>
        typeof p.latitude === 'number' &&
        !isNaN(p.latitude) &&
        typeof p.longitude === 'number' &&
        !isNaN(p.longitude)
    );
  }, [properties]);

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-xl overflow-hidden shadow-sm border border-slate-200 ${className}`}
      data-testid="dubai-map-wrapper"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[420px] z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterController selectedProperty={selectedProperty} />

        {validProperties.map(property => (
          <MapMarker
            key={property.id}
            property={property}
            isSelected={property.id === selectedPropertyId}
            onSelect={onSelectProperty}
          />
        ))}
      </MapContainer>

      {/* Map Legend Overlay for Match Tiers */}
      {showLegend && (
        <div
          className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-2.5 rounded-lg shadow-md border border-slate-200 text-xs pointer-events-auto"
          data-testid="map-legend"
        >
          <div className="font-semibold text-slate-800 mb-1.5 text-[11px] uppercase tracking-wide">
            Match Status
          </div>
          <div className="space-y-1">
            {(['high', 'nearby', 'stretch', 'other'] as MarkerMatchTier[]).map(tierKey => {
              const tier = TIER_CONFIGS[tierKey];
              return (
                <div key={tierKey} className="flex items-center gap-1.5" data-testid={`legend-${tierKey}`}>
                  <span
                    className="w-3 h-3 rounded-full border border-white shadow-xs shrink-0"
                    style={{ backgroundColor: tier.pinColor }}
                  />
                  <span className="text-slate-600 text-[11px] font-medium leading-none">
                    {tier.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DubaiMap;
