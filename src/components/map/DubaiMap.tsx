import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Globe, Map as MapIcon } from 'lucide-react';
import type { Property, MatchScoreResult } from '../../types';
import { MapMarker, TIER_CONFIGS, type MarkerMatchTier } from './MapMarker';

export const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];
export const DEFAULT_ZOOM = 11;

export type MapMode = 'satellite' | 'street';

export interface DubaiMapProps {
  properties: (Property & { score?: MatchScoreResult })[];
  selectedPropertyId?: string;
  onSelectProperty?: (id: string) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
  showLegend?: boolean;
  defaultMode?: MapMode;
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
  defaultMode = 'satellite',
}) => {
  const [mapMode, setMapMode] = useState<MapMode>(defaultMode);

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
      className={`relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-950 ${className}`}
      data-testid="dubai-map-wrapper"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[440px] z-0"
      >
        {/* Real-Satellite Imagery (Esri World Imagery) with High-Res Dubai Coastal/Landmark Detail */}
        {mapMode === 'satellite' ? (
          <>
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            {/* Hybrid Reference Layer for Dubai Places, Roads, and Neighborhoods */}
            <TileLayer
              attribution=""
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.9}
            />
          </>
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

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

      {/* Map Mode Switcher: Real Satellite vs Street */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
        <div
          data-testid="map-mode-toggle"
          className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 text-white backdrop-blur-md border border-white/20 shadow-xl"
        >
          <button
            type="button"
            data-testid="map-mode-satellite"
            onClick={() => setMapMode('satellite')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'satellite'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Switch to Real Satellite Imagery"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>
          <button
            type="button"
            data-testid="map-mode-street"
            onClick={() => setMapMode('street')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapMode === 'street'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Switch to Street Map"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Street</span>
          </button>
        </div>
      </div>

      {/* Luxury Map Legend Overlay for Match Tiers */}
      {showLegend && (
        <div
          className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl shadow-2xl border border-white/15 text-xs pointer-events-auto text-slate-200"
          data-testid="map-legend"
        >
          <div className="font-bold text-white mb-2 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Dubai Match Tiers</span>
          </div>
          <div className="space-y-1.5">
            {(['high', 'nearby', 'stretch', 'other'] as MarkerMatchTier[]).map(tierKey => {
              const tier = TIER_CONFIGS[tierKey];
              return (
                <div key={tierKey} className="flex items-center gap-2" data-testid={`legend-${tierKey}`}>
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs shrink-0"
                    style={{ backgroundColor: tier.pinColor }}
                  />
                  <span className="text-slate-300 text-[11px] font-medium leading-none">
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
