import React from 'react';
import { Home, Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
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
}) => {
  const count = properties.length;
  const shortlistedSet = new Set(shortlistedIds);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} data-testid="property-list-loading">
        <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
              <div className="aspect-[16/10] bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-8 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-200 rounded-xl" />
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
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900" data-testid="property-count-header">
            {count === 0
              ? 'No matching properties in Dubai'
              : `Showing ${count} matching ${count === 1 ? 'property' : 'properties'} in Dubai`}
          </h2>
        </div>

        {count > 0 && properties.some(p => p.score) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Ranked by match score</span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {count === 0 ? (
        <div
          className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-4 my-4"
          data-testid="property-list-empty"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">No matching properties found</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your locality, increasing budget stretch (+15% to +30%), or removing specific filters to see more results.
            </p>
          </div>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        /* Property Cards Grid */
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
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
