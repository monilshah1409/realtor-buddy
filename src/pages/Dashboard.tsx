import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Bookmark,
  Share2,
  ExternalLink,
  X,
  MessageSquare,
  CheckCircle,
  Copy,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Property, MatchCriteria, Profile, ScoredProperty } from '../types';
import { FilterBar } from '../components/search/FilterBar';
import { PropertyList } from '../components/property/PropertyList';
import { DubaiMap } from '../components/map/DubaiMap';
import { sortPropertiesByMatch } from '../utils/scoring';

export interface DashboardProps {
  properties: Property[];
  agentProfile?: Partial<Profile>;
  shortlistedIds: string[];
  onToggleShortlist: (propertyId: string) => void;
  onClearShortlist: () => void;
  onNavigate: (path: string) => void;
  isShortlistDrawerOpen?: boolean;
  onCloseShortlistDrawer?: () => void;
  className?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  properties,
  agentProfile,
  shortlistedIds,
  onToggleShortlist,
  onClearShortlist,
  onNavigate,
  isShortlistDrawerOpen = false,
  onCloseShortlistDrawer,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCriteria, setMatchCriteria] = useState<MatchCriteria>({
    targetLocality: '',
    budgetStretchPercent: 15,
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(
    properties.length > 0 ? properties[0].id : undefined
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLocalShortlistOpen, setIsLocalShortlistOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

  const showShortlistDrawer = isShortlistDrawerOpen || isLocalShortlistOpen;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Text Search Filter (title, locality, description, developer)
  const filteredProperties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return properties;

    return properties.filter((p) => {
      const matchTitle = p.title.toLowerCase().includes(query);
      const matchLocality = p.locality.toLowerCase().includes(query);
      const matchSub = p.sub_community?.toLowerCase().includes(query);
      const matchDev = p.developer_name.toLowerCase().includes(query);
      const matchDesc = p.description.toLowerCase().includes(query);
      return matchTitle || matchLocality || matchSub || matchDev || matchDesc;
    });
  }, [properties, searchQuery]);

  // 2. Score & rank matching properties using AI match criteria
  const scoredProperties: ScoredProperty[] = useMemo(() => {
    return sortPropertiesByMatch(filteredProperties, matchCriteria);
  }, [filteredProperties, matchCriteria]);

  // Selected property reference
  const selectedProperty = useMemo(() => {
    return (
      scoredProperties.find((p) => p.id === selectedPropertyId) ||
      scoredProperties[0] ||
      undefined
    );
  }, [scoredProperties, selectedPropertyId]);

  // Shortlisted property objects
  const shortlistedProperties = useMemo(() => {
    const set = new Set(shortlistedIds);
    return properties.filter((p) => set.has(p.id));
  }, [properties, shortlistedIds]);

  const handleSelectProperty = (id: string) => {
    setSelectedPropertyId(id);
    // Smoothly scroll property card into view on mobile
    const cardElement = document.querySelector(`[data-testid="property-card-${id}"]`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleShareProperty = (property: Property) => {
    const shareUrl = `${window.location.origin}/share/${property.share_token || property.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      showToast(`Confidential link copied for "${property.title}"!`);
    } else {
      showToast(`Public link: ${shareUrl}`);
    }
  };

  const handleGenerateShortlistLink = () => {
    if (shortlistedProperties.length === 0) return;
    const shortlistToken = 'curated-client-portfolio';
    const shortlistUrl = `${window.location.origin}/shortlist/${shortlistToken}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shortlistUrl);
      showToast('Client Shortlist Link copied to clipboard!');
    }
  };

  const handleOpenPublicShortlist = () => {
    onNavigate('/shortlist/curated-client-portfolio');
  };

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-[#FAF8F5] flex flex-col ${className}`}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          data-testid="dashboard-toast"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-500/30 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick Search Header Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200/90 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Search Dubai community or property"
              placeholder="Search Dubai community, property title, or developer (e.g. Downtown Dubai, Emaar, Marina)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium bg-stone-50 hover:bg-white focus:bg-white text-slate-900 placeholder-stone-400 border border-stone-200 focus:border-amber-500 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                aria-label="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Shortlist Quick Access Pill */}
          {shortlistedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsLocalShortlistOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{shortlistedIds.length} in Shortlist</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <FilterBar
          initialCriteria={matchCriteria}
          onChange={(newCriteria) => setMatchCriteria(newCriteria)}
          onReset={() => {
            setSearchQuery('');
            setMatchCriteria({
              targetLocality: '',
              budgetStretchPercent: 15,
            });
          }}
        />

        {/* Mobile View Switcher (< lg screens) */}
        <div className="flex lg:hidden items-center p-1 bg-stone-200/80 rounded-xl" role="tablist" aria-label="Dashboard View Switcher">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'list'}
            onClick={() => setMobileTab('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mobileTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>List View ({scoredProperties.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'map'}
            onClick={() => setMobileTab('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mobileTab === 'map'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Dubai Map (Satellite)</span>
          </button>
        </div>

        {/* Responsive Split View: Left Cards List | Right Leaflet DubaiMap */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Property List Cards (7 cols on desktop) */}
          <div className={`lg:col-span-7 min-w-0 space-y-4 ${mobileTab === 'map' ? 'hidden lg:block' : 'block'}`}>
            <PropertyList
              properties={scoredProperties}
              selectedPropertyId={selectedPropertyId}
              shortlistedIds={shortlistedIds}
              showAgentDetails={true}
              onSelectProperty={handleSelectProperty}
              onAddToShortlist={(prop) => onToggleShortlist(prop.id)}
              onShareLink={handleShareProperty}
              onResetFilters={() => {
                setSearchQuery('');
                setMatchCriteria({
                  targetLocality: '',
                  budgetStretchPercent: 15,
                });
              }}
            />
          </div>

          {/* Right Column: Sticky Interactive DubaiMap (5 cols on desktop) */}
          <div className={`lg:col-span-5 min-w-0 lg:sticky lg:top-20 space-y-3 ${mobileTab === 'list' ? 'hidden lg:block' : 'block'}`}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Dubai Real-Satellite Geographic Map</span>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">
                High-Resolution Hybrid View
              </span>
            </div>

            <div className="h-[480px] sm:h-[540px] lg:h-[640px] w-full rounded-2xl overflow-hidden border border-stone-300 shadow-md bg-stone-900">
              <DubaiMap
                key={`dubai-map-${mobileTab}`}
                properties={scoredProperties}
                selectedPropertyId={selectedPropertyId}
                onSelectProperty={handleSelectProperty}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Shortlist Tray / Slide-over Drawer */}
      {showShortlistDrawer && (
        <div
          data-testid="shortlist-drawer"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-stone-200">
            {/* Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold border border-amber-500/20">
                  <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-slate-900 leading-tight">
                    Client Shortlist Tray
                  </h3>
                  <p className="text-xs text-stone-500">
                    {shortlistedProperties.length}{' '}
                    {shortlistedProperties.length === 1 ? 'property' : 'properties'} selected
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsLocalShortlistOpen(false);
                  onCloseShortlistDrawer?.();
                }}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
                aria-label="Close Shortlist"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {shortlistedProperties.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-serif text-sm font-bold text-slate-700">No properties in shortlist</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1">
                      Click "Add to Shortlist" on any property card to build a presentation for your client.
                    </p>
                  </div>
                </div>
              ) : (
                shortlistedProperties.map((prop) => (
                  <div
                    key={prop.id}
                    className="flex items-center gap-3 p-3 bg-stone-50/80 rounded-2xl border border-stone-200/90 hover:border-amber-400/50 transition-all"
                  >
                    <img
                      src={
                        prop.photos && prop.photos.length > 0
                          ? prop.photos[0]
                          : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={prop.title}
                      className="w-16 h-14 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-xs font-bold text-slate-900 truncate">{prop.title}</h4>
                      <p className="text-[11px] text-stone-500 truncate">{prop.locality}</p>
                      <p className="text-xs font-bold text-slate-900 font-serif tabular-nums mt-0.5">
                        AED {prop.price_aed.toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleShortlist(prop.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                      aria-label={`Remove ${prop.title} from shortlist`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            {shortlistedProperties.length > 0 && (
              <div className="p-5 border-t border-stone-100 bg-stone-50/80 space-y-2.5">
                <button
                  type="button"
                  onClick={handleGenerateShortlistLink}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold text-xs shadow-md border border-amber-500/30 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Client Shortlist Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPublicShortlist}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-slate-800 border border-stone-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-amber-600" />
                  <span>View Public Shortlist Page</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={onClearShortlist}
                    className="text-[11px] text-stone-400 hover:text-rose-600 font-medium cursor-pointer"
                  >
                    Clear All Items
                  </button>
                  <span className="text-[11px] text-stone-400 font-medium">
                    Protected: Wholesaler & Price Hidden
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
