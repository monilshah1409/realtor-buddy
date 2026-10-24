import React from 'react';
import { Building2, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import type { Property, MatchScoreResult } from '../../types';
import PropertyCard from './PropertyCard';

export interface PropertyListProps {
  properties: (Property & { score?: MatchScoreResult })[];
  selectedPropertyId?: string;
  shortlistedIds?: string[];
  showAgentDetails?: boolean;
  onSelectProperty?: (id: string) => void;
  onAddToShortlist?: (property: Property) => void;
  onShareLink?: (property: Property) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
  className?: string;
  gridClassName?: string;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties = [],
  selectedPropertyId,
  shortlistedIds = [],
  showAgentDetails = true,
  onSelectProperty,
  onAddToShortlist,
  onShareLink,
  onResetFilters,
  isLoading = false,
  className = '',
  gridClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-5',
}) => {
  const count = properties.length;
  const shortlistedSet = new Set(shortlistedIds);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} data-testid="property-list-loading">
        <div className="h-6 w-48 bg-stone-200 animate-pulse rounded-lg" />
        <div className={`grid ${gridClassName}`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs animate-pulse">
              <div className="aspect-[16/10] bg-stone-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-stone-200 rounded w-3/4" />
                <div className="h-8 bg-stone-100 rounded-xl" />
                <div className="h-10 bg-stone-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} data-testid="property-list">
      {/* Header / Active Count */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-amber-600" />
          <h2 className="font-serif text-sm font-bold text-slate-900 tracking-tight" data-testid="property-count-header">
            {count === 0
              ? 'No matching properties in Dubai'
              : `Showing ${count} matching ${count === 1 ? 'property' : 'properties'} in Dubai`}
          </h2>
        </div>

        {count > 0 && properties.some(p => p.score) && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Ranked by match score</span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {count === 0 ? (
        <div
          className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center space-y-4 my-4"
          data-testid="property-list-empty"
        >
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-serif text-base font-bold text-slate-900">No matching properties found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your locality, increasing budget stretch (+15% to +30%), or removing specific filters to see more results.
            </p>
          </div>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        /* Property Cards Grid */
        <div
          className={`grid ${gridClassName}`}
          data-testid="property-grid"
        >
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              score={property.score}
              isSelected={property.id === selectedPropertyId}
              isShortlisted={shortlistedSet.has(property.id)}
              showAgentDetails={showAgentDetails}
              onSelect={onSelectProperty}
              onAddToShortlist={onAddToShortlist}
              onShareLink={onShareLink}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyList;
