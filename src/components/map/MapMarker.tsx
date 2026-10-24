import React, { useEffect, useMemo, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Property, MatchScoreResult } from '../../types';

export type MarkerMatchTier = 'high' | 'nearby' | 'stretch' | 'other';

export interface TierConfig {
  name: string;
  pinColor: string;
  strokeColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glowColor: string;
}

export const TIER_CONFIGS: Record<MarkerMatchTier, TierConfig> = {
  high: {
    name: 'High Match',
    pinColor: '#10b981', // emerald-500
    strokeColor: '#047857', // emerald-700
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  nearby: {
    name: 'Nearby Community',
    pinColor: '#0ea5e9', // sky-500
    strokeColor: '#0369a1', // sky-700
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-300',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-300',
    glowColor: 'rgba(14, 165, 233, 0.4)',
  },
  stretch: {
    name: 'High-Value Stretch',
    pinColor: '#f59e0b', // amber-500
    strokeColor: '#b45309', // amber-700
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  other: {
    name: 'Other',
    pinColor: '#64748b', // slate-500
    strokeColor: '#334155', // slate-700
    badgeBg: 'bg-slate-50 text-slate-800 border-slate-300',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  },
};

/**
 * Determines marker match tier from MatchScoreResult:
 * - Stretch match -> 'stretch' (Amber)
 * - Nearby locality tag -> 'nearby' (Sky Blue)
 * - Score >= 85 (or >= 90) -> 'high' (Emerald)
 * - Otherwise -> 'other' (Slate)
 */
export function getMarkerTier(score?: MatchScoreResult): MarkerMatchTier {
  if (!score) return 'other';

  if (score.isStretchMatch || score.budgetTag === 'High-Value Stretch' || score.budgetTag?.toLowerCase().includes('stretch')) {
    return 'stretch';
  }

  if (
    score.localityTag?.toLowerCase().includes('nearby') ||
    score.localityTag?.toLowerCase().includes('adjacent')
  ) {
    return 'nearby';
  }

  if (score.totalScore >= 85) {
    return 'high';
  }

  return 'other';
}

/**
 * Creates custom SVG Leaflet DivIcon colored by tier
 */
export function createCustomMarkerIcon(
  tier: MarkerMatchTier,
  isSelected: boolean,
  score?: number
): L.DivIcon {
  const config = TIER_CONFIGS[tier];
  const size = isSelected ? 40 : 34;
  const height = isSelected ? 48 : 42;
  const pinColor = config.pinColor;
  const strokeColor = isSelected ? '#0f172a' : '#ffffff';
  const strokeWidth = isSelected ? 2.5 : 1.5;
  const displayScore = typeof score === 'number' ? Math.round(score) : null;

  const html = `
    <div 
      class="realtor-custom-pin ${isSelected ? 'marker-selected' : ''}" 
      data-testid="map-marker-pin"
      data-tier="${tier}"
      data-color="${pinColor}"
      data-selected="${isSelected ? 'true' : 'false'}"
      style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${height}px; filter: drop-shadow(0 4px 6px ${isSelected ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)'}); cursor: pointer;"
    >
      <svg width="${size}" height="${height}" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M18 2C9.71573 2 3 8.71573 3 17C3 27.5 16.5 41.5 17.38 42.4C17.72 42.75 18.28 42.75 18.62 42.4C19.5 41.5 33 27.5 33 17C33 8.71573 26.2843 2 18 2Z"
          fill="${pinColor}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
        />
        <circle cx="18" cy="17" r="10" fill="#ffffff" />
        ${
          displayScore !== null
            ? `<text x="18" y="21" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${displayScore >= 100 ? '9' : '10.5'}" font-weight="700" fill="${pinColor}" text-anchor="middle">${displayScore}</text>`
            : `<circle cx="18" cy="17" r="4.5" fill="${pinColor}" />`
        }
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
    popupAnchor: [0, -height + 4],
  });
}

export interface MapMarkerProps {
  property: Property & { score?: MatchScoreResult };
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export const MapMarker: React.FC<MapMarkerProps> = ({
  property,
  isSelected = false,
  onSelect,
  onViewDetails,
}) => {
  const markerRef = useRef<L.Marker>(null);
  const tier = getMarkerTier(property.score);
  const tierConfig = TIER_CONFIGS[tier];

  const icon = useMemo(() => {
    return createCustomMarkerIcon(tier, isSelected, property.score?.totalScore);
  }, [tier, isSelected, property.score?.totalScore]);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      try {
        markerRef.current.openPopup();
      } catch {
        // Safe fallback in test environments without full DOM rendering
      }
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[property.latitude, property.longitude]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => {
          onSelect?.(property.id);
        },
      }}
    >
      <Popup className="realtor-map-popup" minWidth={260} maxWidth={320}>
        <div className="p-1 text-slate-900 font-sans" data-testid={`popup-${property.id}`}>
          {property.photos && property.photos.length > 0 && (
            <div className="relative w-full h-32 mb-2 rounded overflow-hidden bg-slate-100">
              <img
                src={property.photos[0]}
                alt={property.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {property.score && (
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-full border shadow-sm ${tierConfig.badgeBg}`}
                  data-testid="popup-score-badge"
                >
                  {property.score.totalScore}% Match
                </span>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border ${tierConfig.badgeBg}`}
                data-testid="popup-tier-badge"
              >
                {tierConfig.name}
              </span>
              {property.score?.localityTag && (
                <span className="text-[11px] text-slate-500 font-medium" data-testid="popup-locality-tag">
                  {property.score.localityTag}
                </span>
              )}
              {property.score?.budgetTag && (
                <span className="text-[11px] text-slate-500 font-medium" data-testid="popup-budget-tag">
                  {property.score.budgetTag}
                </span>
              )}
            </div>

            <h3 className="font-semibold text-sm leading-snug text-slate-900" title={property.title} data-testid="popup-title">
              {property.title}
            </h3>

            <p className="text-xs text-slate-600 flex items-center gap-1" data-testid="popup-locality">
              <span>{property.locality}{property.sub_community ? `, ${property.sub_community}` : ''}</span>
            </p>

            <div className="text-xs text-slate-500 flex items-center gap-2 py-0.5" data-testid="popup-specs">
              <span>{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Bed`}</span>
              <span>•</span>
              <span>{property.bathrooms} Bath</span>
              <span>•</span>
              <span>{property.area_sqft.toLocaleString()} sqft</span>
            </div>

            <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Price</div>
                <div className="text-sm font-bold text-slate-900" data-testid="popup-price">
                  AED {property.price_aed.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Handover</div>
                <div className="text-xs font-medium text-slate-700" data-testid="popup-handover">
                  {property.handover_date}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => (onViewDetails ? onViewDetails(property.id) : onSelect?.(property.id))}
              className="w-full mt-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow transition-colors flex items-center justify-center gap-1.5"
              data-testid="popup-select-btn"
            >
              <span>View Property Details</span>
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

export default MapMarker;
