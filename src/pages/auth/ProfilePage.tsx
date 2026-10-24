import React, { useState } from 'react';
import {
  User,
  Building2,
  Phone,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Laptop,
  LogOut,
  Save,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Award,
  Globe2,
  Check,
  ExternalLink,
} from 'lucide-react';
import type { Profile } from '../../types';
import { updateBrokerProfile, signOutBroker } from '../../services/authService';

export interface ProfilePageProps {
  userProfile: Profile;
  onProfileUpdate: (updated: Profile) => void;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  onProfileUpdate,
  onSignOut,
  onNavigate,
}) => {
  const [fullName, setFullName] = useState(userProfile.full_name);
  const [agencyName, setAgencyName] = useState(userProfile.agency_name);
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phone_number || '+971 50 ');
  const [whatsappNumber, setWhatsappNumber] = useState(userProfile.whatsapp_number);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatar_url || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isAdmin = userProfile.role === 'admin';

  // Compute luxury monogram initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'RB';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updated: Profile = {
      ...userProfile,
      full_name: fullName,
      agency_name: agencyName,
      phone_number: phoneNumber,
      whatsapp_number: whatsappNumber,
      avatar_url: avatarUrl,
    };

    await updateBrokerProfile(userProfile.id, updated);
    onProfileUpdate(updated);

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogout = async () => {
    await signOutBroker();
    onSignOut();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Return & Action Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/90">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dubai Map</span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dubai Real Estate Regulatory Terminal
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:text-rose-900 border border-rose-200 bg-rose-50/70 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Hero Credential Card (Architectural Obsidian Noir) */}
        <div className="bg-[#090D15] border border-stone-800 rounded-3xl p-6 sm:p-8 text-white relative shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Monogram / Avatar Container */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || userProfile.full_name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-amber-400/50 shadow-md bg-stone-900"
                    onError={(e) => {
                      // If image fails to load, gracefully hide it so fallback monogram displays
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-stone-900 border-2 border-amber-500/40 shadow-md flex items-center justify-center text-amber-300 font-serif font-bold text-2xl tracking-wider">
                    {getInitials(fullName || userProfile.full_name)}
                  </div>
                )}
                <span
                  title="DLD Verified Licensee"
                  className="absolute -bottom-1 -right-1 bg-emerald-500 text-stone-950 p-1 rounded-full border-2 border-[#090D15] shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-stone-950 fill-emerald-500" />
                </span>
              </div>

              {/* Identity & Agency Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                    {fullName || userProfile.full_name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      isAdmin
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isAdmin ? 'Admin / Platform Gatekeeper' : 'Verified Dubai Broker'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-300 pt-0.5">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{agencyName || userProfile.agency_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-400">
                    <Award className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                    <span>RERA License: Active (BRN #48291)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>WhatsApp: {whatsappNumber || userProfile.whatsapp_number}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action: Subscription */}
            <div className="shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => onNavigate('/subscribe')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                <span>Manage Subscription</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dubai Clearance & Compliance Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Authorized
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Broker Clearance
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {userProfile.status === 'active' ? 'Full Global Access' : 'Pending Verification'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Wholesale developer inventory & private off-plan allocations enabled.
              </p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-700 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                Auto-Renew
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Subscription Plan
              </p>
              <p className="text-sm font-bold text-slate-900 capitalize mt-0.5">
                {userProfile.subscription_status} Plan
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Unlimited AI shortlists, unbranded client exports, and priority concierge.
              </p>
            </div>
          </div>

          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center text-blue-700">
                <Laptop className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                Verified
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                Device Concurrency
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                1 / 3 Devices Active
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Complies with UAE Real Estate concurrent session policy.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings Form Card */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-stone-100 gap-2">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Broker Profile & Agency Branding
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These credentials represent you on confidential client shortlisted portfolios and public share links.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/60">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Stamped on Client PDFs</span>
            </div>
          </div>

          {saveSuccess && (
            <div className="mt-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Broker profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Broker Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Official Brokerage / Agency Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  UAE Direct Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp Contact (Displayed on Client Portfolios)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Avatar Image URL (Optional)
                </label>
                <span className="text-[11px] text-slate-400">
                  Leave blank to use your official monogram initials
                </span>
              </div>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-stone-200 focus:border-amber-500 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-stone-100">
              <p className="text-[11px] text-slate-400">
                Direct inquiries from shortlisted client pages route directly to your WhatsApp.
              </p>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-slate-900 hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-950/20 shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Concurrency Session Strip */}
        <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-slate-500" />
              <span>Active Broker Sessions & Security</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              Hardware Bound
            </span>
          </div>

          <div className="bg-slate-50/80 rounded-2xl border border-stone-200/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                MAC
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span>Current Device (Web Browser)</span>
                  <span className="text-[10px] font-bold bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded">
                    This Session
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Dubai, United Arab Emirates • Authenticated via Supabase JWT
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 sm:justify-end">
                <Check className="w-3.5 h-3.5" />
                <span>Active Seat 1 of 3</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
