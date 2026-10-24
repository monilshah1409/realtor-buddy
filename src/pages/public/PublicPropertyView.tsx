import React, { useState } from 'react';
import {
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  Phone,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  Sparkles,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Waves,
  Dumbbell,
  Car,
  Eye,
  TreePine,
  Zap,
  Info,
  Maximize,
} from 'lucide-react';
import type { Property, PublicProperty, Profile } from '../../types';
import { BrochureViewer } from '../../components/pdf/BrochureViewer';

export interface PublicPropertyViewProps {
  property: Property | PublicProperty;
  agent?: Partial<Profile>;
  className?: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

export const formatPropertyType = (type?: string): string => {
  if (!type) return 'Residential';
  switch (type.toLowerCase()) {
    case 'studio':
      return 'Studio Suite';
    case '1bhk':
      return '1-BHK Residence';
    case '2bhk':
      return '2-BHK Residence';
    case '3bhk':
      return '3-BHK Residence';
    case '4bhk_plus':
      return '4+ BHK Residence';
    case 'villa':
      return 'Luxury Villa';
    case 'townhouse':
      return 'Modern Townhouse';
    case 'penthouse':
      return 'Exclusive Penthouse';
    default:
      return type.toUpperCase();
  }
};

export const getLocalityHighlights = (
  locality: string,
  subCommunity?: string
): string[] => {
  const loc = locality.toLowerCase();
  if (loc.includes('downtown')) {
    return [
      'Prime Landmark District: Walking distance to Burj Khalifa, Dubai Mall & Dubai Opera',
      'High Capital Appreciation & Elite Global Executive Tenant Demand',
      'Vibrant boulevard lifestyle with Michelin-starred dining, luxury retail & cultural venues',
    ];
  }
  if (loc.includes('marina')) {
    return [
      'Iconic Waterfront Living: 7km continuous marina promenade & luxury yacht berths',
      'Unrivalled Short-Term Rental & Holiday Home Yield Potential',
      'Direct pedestrian access to JBR beaches and Dubai Tram connectivity',
    ];
  }
  if (loc.includes('palm')) {
    return [
      'Ultra-Prestigious Island Address with Private Shoreline & Beach Club Access',
      'World-famous 5-star resort hospitality, Michelin restaurants, and destination wellness',
      'Exceptional high-net-worth capital preservation and iconic trophy asset value',
    ];
  }
  if (loc.includes('business bay')) {
    return [
      'Central Cosmopolitan Hub contiguous with Downtown and the Dubai Water Canal',
      'High-occupancy multinational corporate and executive tenant demographic',
      'Canal-front boardwalks, rooftop lounges, and seamless transit links',
    ];
  }
  if (loc.includes('hills')) {
    return [
      'Master-planned family haven centered around an 18-hole championship golf course',
      'Proximity to Dubai Hills Mall, King\'s College Hospital, and premier international academies',
      'Expansive landscaped parks, shaded jogging trails, and championship sports courts',
    ];
  }
  return [
    `Prime strategic location${subCommunity ? ` in ${subCommunity}` : ''}`,
    'Rapidly appreciating UAE investment corridor with world-class municipal infrastructure',
    'Curated lifestyle amenities with strong rental yields and long-term capital stability',
  ];
};

const AMENITY_LIST = [
  { label: 'Infinity Leisure Pool', icon: Waves },
  { label: 'State-of-the-Art Fitness Center', icon: Dumbbell },
  { label: '24/7 Dedicated Concierge & Security', icon: ShieldCheck },
  { label: 'Covered Resident Parking', icon: Car },
  { label: 'Panoramic Floor-to-Ceiling Views', icon: Eye },
  { label: 'Lush Landscaped Courtyard', icon: TreePine },
  { label: 'High-Speed Elevators', icon: Zap },
  { label: 'Children\'s Play Sanctuary', icon: Sparkles },
];

export const PublicPropertyView: React.FC<PublicPropertyViewProps> = ({
  property,
  agent,
  className = '',
  onBack,
  showBackButton = false,
}) => {
  // Photos array fallback
  const photos =
    property.photos && property.photos.length > 0 ? property.photos : [FALLBACK_PHOTO];

  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isFullscreenLightbox, setIsFullscreenLightbox] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Agent fallbacks
  const agentName = agent?.full_name || 'Verified Dubai Realtor';
  const agencyName = agent?.agency_name || 'Dubai Luxury Real Estate';
  const whatsappNumber = agent?.whatsapp_number || '+971501234567';
  const phoneNumber = agent?.phone_number || agent?.whatsapp_number || '+971501234567';
  const avatarUrl = agent?.avatar_url;

  // Clean WhatsApp number
  const cleanWhatsAppNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const inquiryText = `Hi ${agentName}, I am inquiring about the property "${property.title}" in ${property.locality}. Please provide further details on pricing, availability, and a viewing schedule.`;
  const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
    inquiryText
  )}`;

  // Handover badge calculation
  const isReady =
    property.handover_status === 'ready' ||
    property.handover_date?.toLowerCase().includes('ready');

  const handoverLabel = isReady
    ? `${property.handover_date || 'Ready to Move In'}`
    : `Handover: ${property.handover_date}`;

  const nextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const localityHighlights = getLocalityHighlights(
    property.locality,
    property.sub_community
  );

  // Generate safe presentation brochure filename without developer name
  const safeBrochureFileName = `${property.title
    .replace(/[^a-zA-Z0-9]/g, '_')}_Official_Brochure.pdf`;

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans ${className}`}>
      {/* 1. STICKY TOP BRANDING BAR (Agent & Contact CTAs) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Left: Back button or Agent identity */}
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to Shortlist"
                className="p-2 mr-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            {/* Realtor Avatar */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={agentName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/40 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-300 font-bold flex items-center justify-center text-lg ring-2 ring-amber-400/40 shadow-sm">
                  {agentName.charAt(0)}
                </div>
              )}
              <div
                className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-slate-950 rounded-full p-0.5 shadow-sm"
                title="Verified Specialist"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Realtor Name & Agency */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold text-white truncate leading-tight">
                  {agentName}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-amber-300 border border-amber-500/30 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>RERA Verified</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {agencyName}
              </p>
            </div>
          </div>

          {/* Right: Contact CTAs */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Share Page Button */}
            <button
              type="button"
              onClick={handleShare}
              title="Share property presentation"
              aria-label="Share property presentation"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700/60 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
            </button>

            {/* Phone Call CTA */}
            <a
              href={`tel:${phoneNumber}`}
              aria-label="Call Agent"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all border border-slate-700 shadow-sm cursor-pointer"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Call</span>
            </a>

            {/* Primary WhatsApp CTA */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inquire via WhatsApp"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-extrabold shadow-md shadow-amber-950/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        {/* A. TITLE & LOCATION HEADER */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Handover Timeline Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isReady
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-blue-950/80 text-blue-300 border-blue-800'
              }`}
            >
              <span>{handoverLabel}</span>
            </div>

            {/* Property Type Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{formatPropertyType(property.property_type)}</span>
            </div>

            {/* Exclusive Presentation Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Private Client Preview</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm sm:text-base">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {property.locality}
                  {property.sub_community ? ` • ${property.sub_community}` : ''}
                  , Dubai, UAE
                </span>
              </div>
            </div>

            {/* Price on Application (Protecting Agent Commission for Public View, transparent Wholesale Price for Agent View) */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl px-5 py-3 text-right shrink-0 shadow-lg">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                {showBackButton && typeof (property as any).price_aed === 'number'
                  ? 'Agent Wholesale Price'
                  : 'Investment Pricing'}
              </div>
              <div className="font-serif text-xl sm:text-2xl font-bold text-amber-300">
                {showBackButton && typeof (property as any).price_aed === 'number'
                  ? `AED ${(property as any).price_aed.toLocaleString()}`
                  : 'Price on Application'}
              </div>
              <div className="text-[11px] text-slate-400">
                {showBackButton && (property as any).developer_name
                  ? (property as any).developer_name
                  : 'Direct Buyer Representation'}
              </div>
            </div>
          </div>
        </section>

        {/* B. HERO IMAGE GALLERY & LIGHTBOX */}
        <section className="space-y-4">
          <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
            <img
              data-testid="main-gallery-image"
              src={photos[activePhotoIndex]}
              alt={`${property.title} - View ${activePhotoIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Subtle Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30 pointer-events-none" />

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  aria-label="Previous photo"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  aria-label="Next photo"
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Top Right Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreenLightbox(true)}
              aria-label="View fullscreen"
              className="absolute top-4 right-4 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700/80 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm transition-all hover:scale-105 shadow-md"
            >
              <Maximize className="w-4 h-4 text-emerald-400" />
              <span>Fullscreen</span>
            </button>

            {/* Bottom Bar: Image Count & Title */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg font-medium">
                Verified Gallery Presentation
              </div>
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
                {activePhotoIndex + 1} / {photos.length}
              </div>
            </div>
          </div>

          {/* Thumbnails strip */}
          {photos.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {photos.map((photo, index) => (
                <button
                  key={`thumb-${index}`}
                  type="button"
                  onClick={() => setActivePhotoIndex(index)}
                  className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    index === activePhotoIndex
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105'
                      : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* FULLSCREEN LIGHTBOX MODAL */}
        {isFullscreenLightbox && (
          <div
            data-testid="fullscreen-lightbox"
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6"
          >
            <div className="flex items-center justify-between text-white pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{property.title}</span>
                <span className="text-sm font-mono text-slate-400">
                  {activePhotoIndex + 1} / {photos.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenLightbox(false)}
                aria-label="Close fullscreen"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <img
                src={photos[activePhotoIndex]}
                alt={property.title}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    aria-label="Previous photo in fullscreen"
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    aria-label="Next photo in fullscreen"
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}
            </div>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-white/10">
              Use arrows to navigate • Esc or close button to exit
            </div>
          </div>
        )}

        {/* C. KEY SPECIFICATIONS GRID */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Bedrooms */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Bed className="w-5 h-5" />
            </div>
            <div className="text-xs uppercase font-medium text-slate-400 tracking-wider">
              Bedrooms
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">
              {property.bedrooms === 0
                ? 'Studio'
                : `${property.bedrooms} ${property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}`}
            </div>
          </div>

          {/* Bathrooms */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <Bath className="w-5 h-5" />
            </div>
            <div className="text-xs uppercase font-medium text-slate-400 tracking-wider">
              Bathrooms
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">
              {property.bathrooms} Bathrooms
            </div>
          </div>

          {/* Total Area */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div className="text-xs uppercase font-medium text-slate-400 tracking-wider">
              Built-up Area
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">
              {property.area_sqft.toLocaleString()} sq ft
            </div>
          </div>

          {/* Handover Timeline */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-xs uppercase font-medium text-slate-400 tracking-wider">
              Project Status
            </div>
            <div className="text-base sm:text-lg font-bold text-white mt-1 truncate">
              {isReady ? 'Immediate Occupancy' : 'Under Development'}
            </div>
          </div>
        </section>

        {/* D. PROPERTY OVERVIEW & LOCALITY HIGHLIGHTS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Description & Amenities */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 sm:p-8 space-y-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <Building2 className="w-6 h-6 text-emerald-400" />
                <span>Property Overview</span>
              </h2>
              <p className="text-slate-300 leading-relaxed text-base whitespace-pre-line">
                {property.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-6 sm:p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <span>Curated Features & Amenities</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {AMENITY_LIST.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={`amenity-${idx}`}
                      className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-700/60 text-emerald-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-200">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Locality Community Highlights */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Location Highlights</h3>
                  <p className="text-xs text-slate-400">Exclusive Community Profile</p>
                </div>
              </div>

              <div className="space-y-3.5">
                {localityHighlights.map((hl, index) => (
                  <div key={`hl-${index}`} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-300 leading-normal">
                      {hl}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Info className="w-4 h-4 text-emerald-400" />
                  <span>Buyer Advisory</span>
                </div>
                <p>
                  Official Dubai Land Department registry verification and private unit viewing arranged directly through your verified agent.
                </p>
              </div>
            </div>

            {/* Quick Contact Box */}
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-3xl p-6 text-center space-y-4">
              <h4 className="text-base font-bold text-emerald-300">
                Interested in this Residence?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect directly with your verified broker to receive pricing structures, floor plans, and VIP reservation priority.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Direct Private Chat"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Instant Inquiry</span>
              </a>
            </div>
          </div>
        </section>

        {/* E. IN-PAGE EMBEDDED PDF BROCHURE VIEWER */}
        <section className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>Official Architecture & Floorplan Brochure</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Explore detailed master layouts, specifications, and project architectural plans.
              </p>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
            <BrochureViewer
              brochureUrl={property.brochure_onedrive_url}
              fileName={safeBrochureFileName}
              title={`${property.title} - Official Presentation`}
            />
          </div>
        </section>

        {/* F. BOTTOM CONSULTATION BANNER */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Certified UAE Real Estate Service</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Schedule a Private VIP Viewing
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We provide comprehensive property advisory, legal conveyancing guidance, and unit reservation support across Dubai.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Direct Chat Line"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all hover:scale-105"
            >
              <MessageSquare className="w-5 h-5 fill-white" />
              <span>Private Chat Line</span>
            </a>

            <a
              href={`tel:${phoneNumber}`}
              aria-label="Telephone Inquiries"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 shadow-lg transition-all"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Telephone Inquiries</span>
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} Licensed UAE Brokerage. Presented via Realtor Buddy.</p>
          <p className="text-[11px] text-slate-600">
            All property renderings, floor plans, and handover timelines are subject to completion certificates.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicPropertyView;
