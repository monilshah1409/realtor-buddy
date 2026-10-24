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
  Sparkles,
  ArrowLeft,
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
    <div className="min-h-screen bg-stone-900 text-stone-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-stone-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dubai Map</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Header Banner */}
        <div className="bg-stone-800/80 border border-stone-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
            <div className="relative">
              <img
                src={
                  avatarUrl ||
                  userProfile.avatar_url ||
                  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
                }
                alt={userProfile.full_name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl"
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-stone-950 p-1 rounded-full border-2 border-stone-900">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-stone-100">
                  {userProfile.full_name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isAdmin ? 'Admin / Platform Gatekeeper' : 'Verified Dubai Broker'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{userProfile.agency_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp: {userProfile.whatsapp_number}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <button
                onClick={() => onNavigate('/subscribe')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Manage Subscription</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Concurrency Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
                Broker Clearance
              </p>
              <p className="text-sm font-medium text-stone-200">
                {userProfile.status === 'active' ? 'Full Global Access' : 'Pending Verification'}
              </p>
            </div>
          </div>

          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
                Subscription Plan
              </p>
              <p className="text-sm font-medium text-stone-200 capitalize">
                {userProfile.subscription_status} Plan
              </p>
            </div>
          </div>

          <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
                Device Concurrency
              </p>
              <p className="text-sm font-medium text-stone-200">
                1 / 3 Devices Active
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="bg-stone-800/60 border border-stone-700/60 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
          <h2 className="text-lg font-serif font-medium text-stone-100 mb-2">
            Broker Profile & Agency Branding
          </h2>
          <p className="text-xs text-stone-400 mb-6">
            These credentials represent you on confidential client shortlisted portfolios and public share links.
          </p>

          {saveSuccess && (
            <div className="mb-6 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Broker profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Agency Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  UAE Direct Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  WhatsApp Contact (Displayed on Client Portfolios)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Avatar Image URL
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl font-medium text-sm text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
