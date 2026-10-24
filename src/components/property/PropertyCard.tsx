import React, { useState } from 'react';
import {
  Bed,
  Bath,
  Maximize2,
  Share2,
  Bookmark,
  BookmarkCheck,
  Building2,
  MapPin,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { Property, MatchScoreResult } from '../../types';
import { getMarkerTier, TIER_CONFIGS } from '../map/MapMarker';

export interface PropertyCardProps {
  property: Property;
  score?: MatchScoreResult;
  isSelected?: boolean;
  isShortlisted?: boolean;
  showAgentDetails?: boolean;
  onAddToShortlist?: (property: Property) => void;
  onShareLink?: (property: Property) => void;
  onSelect?: (id: string) => void;
  className?: string;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  score,
  isSelected = false,
  isShortlisted = false,
  showAgentDetails = true,
  onAddToShortlist,
  onShareLink,
  onSelect,
  className = '',
}) => {
  const [imgSrc, setImgSrc] = useState<string>(
    property.photos && property.photos.length > 0 ? property.photos[0] : FALLBACK_IMAGE
  );
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  const handleImageError = () => {
    if (!imgFailed) {
      setImgFailed(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  const tier = getMarkerTier(score);
  const tierConfig = TIER_CONFIGS[tier];

  const isReady = property.handover_status === 'ready' || property.handover_date?.toLowerCase().includes('ready');

  return (
    <div
      onClick={() => onSelect?.(property.id)}
      className={`group relative bg-white rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-0.5 ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/20'
          : 'border-stone-200/90 hover:border-amber-400/60'
      } ${className}`}
      data-testid={`property-card-${property.id}`}
      tabIndex={0}
      role="article"
      aria-label={`${property.title} in ${property.locality}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(property.id);
        }
      }}
    >
      {/* Property Image & Overlays */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <img
          src={imgSrc}
          alt={property.title}
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Subtle Vignette Gradient for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/35 pointer-events-none" />

        {/* Top Badges: Match Score & Handover Timeline (No AI Emojis) */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          {score ? (
            <div
              data-testid="property-card-score-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-md pointer-events-auto shrink-0 ${tierConfig.badgeBg}`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>{Math.round(score.totalScore)}% Match</span>
            </div>
          ) : (
            <div />
          )}

          {/* Handover Timeline Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-950/80 text-white backdrop-blur-md border border-white/20 shadow-md shrink-0">
            {isReady ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            )}
            <span className="whitespace-nowrap">{property.handover_date}</span>
          </div>
        </div>

        {/* Bottom Image Overlay: Locality & Community */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
          <div className="bg-slate-900/90 text-white backdrop-blur-md px-3 py-1 rounded-xl border border-white/20 shadow-md flex items-center gap-1.5 text-xs font-semibold min-w-0 max-w-[70%] truncate">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{property.locality}</span>
            {property.sub_community && (
              <>
                <span className="text-slate-400 shrink-0">•</span>
                <span className="text-slate-300 font-normal truncate">{property.sub_community}</span>
              </>
            )}
          </div>

          {score?.budgetTag && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border shrink-0 whitespace-nowrap shadow-sm ${
                score.isStretchMatch
                  ? 'bg-amber-500/90 text-slate-950 border-amber-300 font-extrabold'
                  : 'bg-emerald-600/90 text-white border-emerald-400'
              }`}
            >
              {score.budgetTag}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3.5">
        {/* Title */}
        <h3
          className="font-serif text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1 leading-snug"
          title={property.title}
        >
          {property.title}
        </h3>

        {/* Specs Row: Beds, Baths, Sqft */}
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 bg-stone-50/90 px-3 py-2 rounded-xl border border-stone-200/60">
          <div className="flex items-center gap-1.5 shrink-0">
            <Bed className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} Bed`}</span>
          </div>
          <div className="w-px h-3.5 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Bath className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{property.bathrooms} Bath</span>
          </div>
          <div className="w-px h-3.5 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{property.area_sqft.toLocaleString()} sqft</span>
          </div>
        </div>

        {/* Developer & Wholesale Price for Authenticated Agents */}
        {showAgentDetails && (
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate" title={property.developer_name}>
                  {property.developer_name}
                </span>
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                Agent Wholesale Price
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap tabular-nums">
                AED {property.price_aed.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToShortlist?.(property);
            }}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
              isShortlisted
                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
            }`}
            aria-label={isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}
          >
            {isShortlisted ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="truncate">Shortlisted</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 shrink-0" />
                <span className="truncate">Add to Shortlist</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShareLink?.(property);
            }}
            className="shrink-0 flex items-center justify-center p-2 rounded-xl border border-stone-200 text-slate-600 hover:text-slate-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Share Property Link"
            aria-label="Share Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {property.brochure_onedrive_url && (
            <a
              href={property.brochure_onedrive_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 flex items-center justify-center p-2 rounded-xl border border-stone-200 text-slate-600 hover:text-slate-900 hover:bg-stone-100 transition-colors cursor-pointer"
              title="View OneDrive Brochure"
              aria-label="View Brochure"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
