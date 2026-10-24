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
  Building2,
  CheckCircle2,
  FileText,
  Eye,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Clock,
} from 'lucide-react';
import type { Property, PublicProperty, Shortlist, Profile } from '../../types';
import PublicPropertyView, { formatPropertyType } from './PublicPropertyView';

export interface PublicShortlistViewProps {
  shortlist?: Shortlist;
  properties?: (Property | PublicProperty)[];
  agent?: Partial<Profile>;
  clientName?: string;
  notes?: string;
  className?: string;
}

const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

export const PublicShortlistView: React.FC<PublicShortlistViewProps> = ({
  shortlist,
  properties: initialProperties,
  agent,
  clientName: initialClientName,
  notes: initialNotes,
  className = '',
}) => {
  // Extract items from shortlist if available
  const listItems =
    initialProperties ||
    (shortlist?.items
      ? (shortlist.items
          .map((item) => item.property)
          .filter(Boolean) as (Property | PublicProperty)[])
      : []);

  const clientName = initialClientName || shortlist?.client_name || 'Private Client';
  const notes =
    initialNotes ||
    shortlist?.notes ||
    'Exclusive property portfolio curated specifically for your Dubai luxury investment profile.';

  // Agent brand fallbacks
  const agentName = agent?.full_name || 'Verified Dubai Realtor';
  const agencyName = agent?.agency_name || 'Dubai Luxury Real Estate';
  const whatsappNumber = agent?.whatsapp_number || '+971501234567';
  const phoneNumber = agent?.phone_number || agent?.whatsapp_number || '+971501234567';
  const avatarUrl = agent?.avatar_url;

  const cleanWhatsAppNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const generalInquiryText = `Hi ${agentName}, I am reviewing the curated shortlist for ${clientName} and would like to discuss next steps.`;
  const generalWhatsAppUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
    generalInquiryText
  )}`;

  // Detailed presentation drill-down state
  const [selectedProperty, setSelectedProperty] = useState<Property | PublicProperty | null>(
    null
  );

  // If a property is selected for full presentation view:
  if (selectedProperty) {
    return (
      <PublicPropertyView
        property={selectedProperty}
        agent={agent}
        showBackButton={true}
        onBack={() => setSelectedProperty(null)}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans ${className}`}>
      {/* 1. STICKY TOP BRANDING HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Agent Branding */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={agentName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/40 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-950 text-amber-300 font-bold flex items-center justify-center text-lg ring-2 ring-amber-400/40 shadow-sm border border-amber-500/20">
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

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href={`tel:${phoneNumber}`}
              aria-label="Call Broker"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all border border-slate-700 shadow-sm cursor-pointer"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Call</span>
            </a>

            <a
              href={generalWhatsAppUrl}
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

      {/* 2. MAIN CONTENT BODY */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-12">
        {/* A. CLIENT GREETING & PERSONALIZED NOTES BANNER */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Private Curated Portfolio</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Curated Property Shortlist for {clientName}
              </h1>
              <p className="text-sm text-slate-400">
                Prepared exclusively by your dedicated Dubai real estate advisor.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/80 border border-stone-800 rounded-2xl px-5 py-3 shrink-0">
              <Layers className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xl font-serif font-bold text-white">
                  {listItems.length} {listItems.length === 1 ? 'Property' : 'Properties'}
                </div>
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                  Verified Selections
                </div>
              </div>
            </div>
          </div>

          {/* Personalized Agent Memo / Briefing */}
          {notes && (
            <div className="relative bg-slate-950/50 border border-slate-800 rounded-2xl p-5 sm:p-6 text-slate-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Advisor Memo
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-200 italic">
                    "{notes}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* B. SHORTLIST PROPERTY CARDS GRID */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-emerald-400" />
              <span>Recommended Residences</span>
            </h2>
            <span className="text-xs text-slate-400">
              Click any property to explore floor plans and full architectural brochure
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listItems.map((prop, index) => {
              const photo = prop.photos && prop.photos.length > 0 ? prop.photos[0] : FALLBACK_PHOTO;
              const isReady =
                prop.handover_status === 'ready' ||
                prop.handover_date?.toLowerCase().includes('ready');
              const itemWhatsAppUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
                `Hi ${agentName}, I am reviewing your shortlist and would like more information on "${prop.title}" in ${prop.locality}.`
              )}`;

              return (
                <div
                  key={prop.id || `shortlist-prop-${index}`}
                  className="bg-slate-800/60 border border-slate-700/70 hover:border-emerald-500/60 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col group"
                >
                  {/* Photo & Handover Badge */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                    <img
                      src={photo}
                      alt={prop.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                    {/* Handover Timeline Badge */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-md ${
                          isReady
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                            : 'bg-blue-950/90 text-blue-300 border-blue-700'
                        }`}
                      >
                        {isReady ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span>{prop.handover_date}</span>
                      </span>
                    </div>

                    {/* Price on Application Protection */}
                    <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-bold text-emerald-400 shadow-md">
                      Price on Application
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {prop.locality}
                          {prop.sub_community ? ` • ${prop.sub_community}` : ''}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                        {prop.title}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {prop.description}
                      </p>
                    </div>

                    {/* Specs Pills */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-700/60 text-center">
                      <div className="p-2 rounded-xl bg-slate-900/50">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Beds</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} Bed`}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/50">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Baths</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {prop.bathrooms} Bath
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/50">
                        <div className="text-[10px] text-slate-400 uppercase font-medium">Area</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {prop.area_sqft.toLocaleString()} sqft
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedProperty(prop)}
                        aria-label={`View Details for ${prop.title}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02]"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Presentation</span>
                      </button>

                      <a
                        href={itemWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Inquire about ${prop.title}`}
                        className="p-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-600/80"
                        title="Direct Unit Inquiry"
                      >
                        <MessageSquare className="w-4 h-4 fill-white" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* C. SIDE-BY-SIDE PROPERTY COMPARISON MATRIX */}
        <section className="space-y-6 pt-6 border-t border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-emerald-400" />
              <span>Property Comparison</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Side-by-side comparison across unit specifications, location districts, and handover readiness.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-950 shadow-xl scrollbar-thin">
            <table className="w-full text-left text-sm text-slate-300 min-w-[700px]">
              <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="px-6 py-4">Specification</th>
                  {listItems.map((prop, idx) => (
                    <th key={`head-${prop.id || idx}`} className="px-6 py-4 text-white">
                      {prop.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {/* Locality */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Locality & District</td>
                  {listItems.map((prop, idx) => (
                    <td key={`loc-${prop.id || idx}`} className="px-6 py-4 font-medium text-white">
                      {prop.locality}
                      {prop.sub_community ? ` (${prop.sub_community})` : ''}
                    </td>
                  ))}
                </tr>

                {/* Layout Type */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Property Type</td>
                  {listItems.map((prop, idx) => (
                    <td key={`type-${prop.id || idx}`} className="px-6 py-4">
                      {formatPropertyType(prop.property_type)}
                    </td>
                  ))}
                </tr>

                {/* Bedrooms */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Bedrooms</td>
                  {listItems.map((prop, idx) => (
                    <td key={`bed-${prop.id || idx}`} className="px-6 py-4 font-bold text-white">
                      {prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} Bed`}
                    </td>
                  ))}
                </tr>

                {/* Bathrooms */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Bathrooms</td>
                  {listItems.map((prop, idx) => (
                    <td key={`bath-${prop.id || idx}`} className="px-6 py-4">
                      {prop.bathrooms} Bath
                    </td>
                  ))}
                </tr>

                {/* Area Sq Ft */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Built-up Area</td>
                  {listItems.map((prop, idx) => (
                    <td key={`sqft-${prop.id || idx}`} className="px-6 py-4 font-semibold text-emerald-400">
                      {prop.area_sqft.toLocaleString()} sq ft
                    </td>
                  ))}
                </tr>

                {/* Handover Timeline */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Handover Timeline</td>
                  {listItems.map((prop, idx) => (
                    <td key={`handover-${prop.id || idx}`} className="px-6 py-4">
                      <span className="font-semibold text-slate-200">
                        {prop.handover_date}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Pricing Status (Protected) */}
                <tr className="hover:bg-slate-900/50">
                  <td className="px-6 py-4 font-semibold text-slate-400">Pricing Tier</td>
                  {listItems.map((prop, idx) => (
                    <td key={`price-${prop.id || idx}`} className="px-6 py-4 text-emerald-400 font-semibold">
                      Price on Application
                    </td>
                  ))}
                </tr>

                {/* Action Drill-Down */}
                <tr className="bg-slate-900/40">
                  <td className="px-6 py-4 font-semibold text-slate-400">Full Presentation</td>
                  {listItems.map((prop, idx) => (
                    <td key={`action-${prop.id || idx}`} className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedProperty(prop)}
                        aria-label={`View Details for ${prop.title} in matrix`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* D. CONSULTATION BANNER */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dedicated Client Representative</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to Discuss These Selections?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We coordinate private VIP developer showings, legal due diligence, and payment schedule negotiation for your shortlisted portfolio.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href={generalWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Direct Private Chat"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 transition-all hover:scale-105"
            >
              <MessageSquare className="w-5 h-5 fill-white" />
              <span>Connect on WhatsApp</span>
            </a>

            <a
              href={`tel:${phoneNumber}`}
              aria-label="Direct Telephone Line"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 shadow-lg transition-all"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Call Advisor</span>
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} Licensed UAE Brokerage. Curated via Realtor Buddy.</p>
          <p className="text-[11px] text-slate-600">
            Confidential portfolio curated exclusively for private client review. Prices and availability subject to confirmation.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicShortlistView;
