import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  DollarSign,
  Maximize,
  MapPin,
  Building,
  Sparkles,
} from 'lucide-react';
import type { MatchCriteria, PropertyType, HandoverStatus } from '../../types';
import { DUBAI_CLUSTERS, DUBAI_LOCALITIES } from '../../data/dubaiClusters';

export interface FilterBarProps {
  initialCriteria?: MatchCriteria;
  onChange: (criteria: MatchCriteria) => void;
  onReset?: () => void;
  className?: string;
}

export const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Studio', value: 'studio' },
  { label: '1 BHK', value: '1bhk' },
  { label: '2 BHK', value: '2bhk' },
  { label: '3 BHK', value: '3bhk' },
  { label: '4+ BHK', value: '4bhk_plus' },
  { label: 'Villa', value: 'villa' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Penthouse', value: 'penthouse' },
];

export const HANDOVER_OPTIONS: { label: string; value: HandoverStatus }[] = [
  { label: 'Ready to Move In', value: 'ready' },
  { label: 'Near Handover', value: 'near_handover' },
  { label: 'Under Construction / Newly Launched', value: 'under_construction' },
];

const DEFAULT_STRETCH_PERCENT = 15;

export const FilterBar: React.FC<FilterBarProps> = ({
  initialCriteria,
  onChange,
  onReset,
  className = '',
}) => {
  const [targetLocality, setTargetLocality] = useState<string>(initialCriteria?.targetLocality || '');
  const [propertyType, setPropertyType] = useState<PropertyType | undefined>(initialCriteria?.propertyType);
  const [preferredHandover, setPreferredHandover] = useState<HandoverStatus | undefined>(initialCriteria?.preferredHandover);
  const [targetBudgetAed, setTargetBudgetAed] = useState<number | undefined>(initialCriteria?.targetBudgetAed);
  const [budgetStretchPercent, setBudgetStretchPercent] = useState<number>(
    initialCriteria?.budgetStretchPercent !== undefined ? initialCriteria.budgetStretchPercent : DEFAULT_STRETCH_PERCENT
  );
  const [minSqft, setMinSqft] = useState<number | undefined>(initialCriteria?.minSqft);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Collect unique Dubai communities from clusters and localities
  const dubaiCommunities = useMemo(() => {
    const list = new Set<string>();
    DUBAI_LOCALITIES.forEach(loc => list.add(loc.name));
    Object.keys(DUBAI_CLUSTERS).forEach(loc => list.add(loc));
    Object.values(DUBAI_CLUSTERS).flat().forEach(loc => list.add(loc));
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, []);

  const emitChange = (updated: Partial<MatchCriteria>) => {
    const newCriteria: MatchCriteria = {
      targetLocality: 'targetLocality' in updated ? updated.targetLocality : targetLocality,
      propertyType: 'propertyType' in updated ? updated.propertyType : propertyType,
      preferredHandover: 'preferredHandover' in updated ? updated.preferredHandover : preferredHandover,
      targetBudgetAed: 'targetBudgetAed' in updated ? updated.targetBudgetAed : targetBudgetAed,
      budgetStretchPercent: 'budgetStretchPercent' in updated ? updated.budgetStretchPercent : budgetStretchPercent,
      minSqft: 'minSqft' in updated ? updated.minSqft : minSqft,
    };
    onChange(newCriteria);
  };

  const handleLocalityChange = (loc: string) => {
    setTargetLocality(loc);
    emitChange({ targetLocality: loc });
  };

  const handlePropertyTypeToggle = (type: PropertyType) => {
    const nextType = propertyType === type ? undefined : type;
    setPropertyType(nextType);
    emitChange({ propertyType: nextType });
  };

  const handleHandoverToggle = (status: HandoverStatus) => {
    const nextStatus = preferredHandover === status ? undefined : status;
    setPreferredHandover(nextStatus);
    emitChange({ preferredHandover: nextStatus });
  };

  const handleBudgetChange = (valueStr: string) => {
    const parsed = valueStr === '' ? undefined : Number(valueStr);
    const valid = parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
    setTargetBudgetAed(valid);
    emitChange({ targetBudgetAed: valid });
  };

  const handleStretchChange = (val: number) => {
    setBudgetStretchPercent(val);
    emitChange({ budgetStretchPercent: val });
  };

  const handleMinSqftChange = (valueStr: string) => {
    const parsed = valueStr === '' ? undefined : Number(valueStr);
    const valid = parsed !== undefined && !isNaN(parsed) && parsed >= 0 ? parsed : undefined;
    setMinSqft(valid);
    emitChange({ minSqft: valid });
  };

  const handleResetClick = () => {
    setTargetLocality('');
    setPropertyType(undefined);
    setPreferredHandover(undefined);
    setTargetBudgetAed(undefined);
    setBudgetStretchPercent(DEFAULT_STRETCH_PERCENT);
    setMinSqft(undefined);
    setSearchQuery('');
    
    onReset?.();
    onChange({
      targetLocality: '',
      propertyType: undefined,
      preferredHandover: undefined,
      targetBudgetAed: undefined,
      budgetStretchPercent: DEFAULT_STRETCH_PERCENT,
      minSqft: undefined,
    });
  };

  // Sync state if initialCriteria changes from outside
  useEffect(() => {
    if (initialCriteria) {
      if (initialCriteria.targetLocality !== undefined) setTargetLocality(initialCriteria.targetLocality);
      if (initialCriteria.propertyType !== undefined) setPropertyType(initialCriteria.propertyType);
      if (initialCriteria.preferredHandover !== undefined) setPreferredHandover(initialCriteria.preferredHandover);
      if (initialCriteria.targetBudgetAed !== undefined) setTargetBudgetAed(initialCriteria.targetBudgetAed);
      if (initialCriteria.budgetStretchPercent !== undefined) setBudgetStretchPercent(initialCriteria.budgetStretchPercent);
      if (initialCriteria.minSqft !== undefined) setMinSqft(initialCriteria.minSqft);
    }
  }, [initialCriteria]);

  // Max stretched budget calculation for helper display
  const maxStretchBudget = targetBudgetAed
    ? Math.round(targetBudgetAed * (1 + budgetStretchPercent / 100))
    : undefined;

  return (
    <div
      className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-5 ${className}`}
      data-testid="filter-bar"
    >
      {/* Top Header Row: Title, Quick Search & Reset */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Smart Search & Match</h2>
            <p className="text-xs text-slate-500">Filters dynamically compute AI match scores</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            aria-label="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Row 1: Locality Dropdown & Property Type Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Locality Dropdown */}
        <div className="lg:col-span-4 space-y-1.5">
          <label htmlFor="filter-locality-select" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Locality / Dubai Area</span>
          </label>
          <div className="relative">
            <select
              id="filter-locality-select"
              aria-label="Locality"
              value={targetLocality}
              onChange={(e) => handleLocalityChange(e.target.value)}
              className="w-full h-10 pl-3 pr-8 text-sm font-medium bg-slate-50 hover:bg-white focus:bg-white text-slate-800 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all appearance-none cursor-pointer"
            >
              <option value="">All Dubai Communities (No restriction)</option>
              {dubaiCommunities.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Property Type Selector Tabs */}
        <div className="lg:col-span-8 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>Property Type</span>
            </span>
            {propertyType && (
              <button
                type="button"
                onClick={() => handlePropertyTypeToggle(propertyType)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear type
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Property Type Options">
            {PROPERTY_TYPES.map((item) => {
              const isSelected = propertyType === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handlePropertyTypeToggle(item.value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={item.label}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Handover Status Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Handover Timeline</span>
          {preferredHandover && (
            <button
              type="button"
              onClick={() => handleHandoverToggle(preferredHandover)}
              className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Clear timeline
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Handover Timeline Options">
          {HANDOVER_OPTIONS.map((opt) => {
            const isSelected = preferredHandover === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleHandoverToggle(opt.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
                aria-pressed={isSelected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 3: Budget, Stretch Slider, Min Sqft */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-slate-100">
        {/* Target Budget AED */}
        <div className="md:col-span-4 space-y-1.5">
          <label htmlFor="filter-budget-input" className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Target Budget (AED)</span>
            </span>
            {targetBudgetAed && (
              <span className="text-[11px] font-semibold text-emerald-600">
                {targetBudgetAed.toLocaleString()} AED
              </span>
            )}
          </label>
          <div className="relative">
            <input
              id="filter-budget-input"
              aria-label="Target Budget"
              type="number"
              min="0"
              step="50000"
              placeholder="e.g. 2,000,000"
              value={targetBudgetAed !== undefined ? targetBudgetAed : ''}
              onChange={(e) => handleBudgetChange(e.target.value)}
              className="w-full h-10 px-3 text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
            />
          </div>
        </div>

        {/* Budget Stretch Range Slider (+0% to +30%) */}
        <div className="md:col-span-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="filter-stretch-slider" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Budget Stretch</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                +{budgetStretchPercent}%
              </span>
              {maxStretchBudget && (
                <span className="text-[11px] text-slate-500">
                  (Up to {maxStretchBudget.toLocaleString()} AED)
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <input
              id="filter-stretch-slider"
              aria-label="Budget Stretch"
              type="range"
              min="0"
              max="30"
              step="5"
              value={budgetStretchPercent}
              onChange={(e) => handleStretchChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5 mt-1">
              <span>0% Strict</span>
              <span>10%</span>
              <span className="font-bold text-amber-600">15% Default</span>
              <span>20%</span>
              <span>30% Max</span>
            </div>
          </div>
        </div>

        {/* Min Area (Sqft) */}
        <div className="md:col-span-3 space-y-1.5">
          <label htmlFor="filter-sqft-input" className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5 text-emerald-600" />
              <span>Min Area (sqft)</span>
            </span>
          </label>
          <div className="relative">
            <input
              id="filter-sqft-input"
              aria-label="Min Area"
              type="number"
              min="0"
              step="50"
              placeholder="e.g. 800"
              value={minSqft !== undefined ? minSqft : ''}
              onChange={(e) => handleMinSqftChange(e.target.value)}
              className="w-full h-10 px-3 text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
