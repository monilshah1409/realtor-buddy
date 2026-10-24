import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  KeyRound,
  Users,
} from 'lucide-react';
import type { Profile } from '../../types';
import {
  signInBroker,
  registerBroker,
  PRESET_PROFILES,
  type RegisterBrokerPayload,
} from '../../services/authService';

export interface AuthPageProps {
  onSuccess: (profile: Profile) => void;
  onNavigateHome: () => void;
  initialMode?: 'sign_in' | 'register' | 'quick_switch';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccess,
  onNavigateHome,
  initialMode = 'sign_in',
}) => {
  const isTestMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
  const [activeTab, setActiveTab] = useState<'sign_in' | 'register' | 'quick_switch'>(
    initialMode
  );

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regAgencyName, setRegAgencyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('+971 50 ');
  const [regWhatsApp, setRegWhatsApp] = useState('+971 50 ');

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail) {
      setErrorMessage('Please enter your broker email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signInBroker(signInEmail, signInPassword);
    setIsLoading(false);

    if (res.success && res.profile) {
      setSuccessMessage(`Welcome back, ${res.profile.full_name}!`);
      setTimeout(() => {
        onSuccess(res.profile!);
      }, 400);
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regAgencyName || !regEmail) {
      setErrorMessage('Please fill in all required broker registration fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const payload: RegisterBrokerPayload = {
      fullName: regFullName,
      agencyName: regAgencyName,
      email: regEmail,
      password: regPassword,
      phoneNumber: regPhone,
      whatsappNumber: regWhatsApp,
      role: 'agent',
    };

    const res = await registerBroker(payload);
    setIsLoading(false);

    if (res.success && res.profile) {
      setSuccessMessage('Broker credentials submitted for verification!');
      setTimeout(() => {
        onSuccess(res.profile!);
      }, 500);
    } else {
      setErrorMessage(res.error || 'Registration failed. Please try again.');
    }
  };

  const handleSelectPreset = (profileKey: string) => {
    const profile = PRESET_PROFILES[profileKey];
    if (profile) {
      setSuccessMessage(`Signed in as ${profile.full_name}`);
      setTimeout(() => {
        onSuccess(profile);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient Spheres */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 group transition-transform hover:scale-105"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-xl tracking-wider font-semibold text-stone-100">
                  REALTOR BUDDY
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded">
                  DUBAI
                </span>
              </div>
              <p className="text-[10px] tracking-widest uppercase text-stone-400">
                Verified Broker Gateway
              </p>
            </div>
          </button>

          <h2 className="mt-6 text-2xl sm:text-3xl font-serif font-medium tracking-tight text-stone-100">
            {activeTab === 'sign_in' && 'Broker Portal Sign In'}
            {activeTab === 'register' && 'Register Broker Credentials'}
            {activeTab === 'quick_switch' && 'Select Broker Persona'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-stone-400">
            Exclusive platform for licensed Dubai real estate professionals
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-stone-800/80 p-1 rounded-xl border border-stone-700/60 mb-6 flex text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('sign_in');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'sign_in'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
          {isTestMode && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('quick_switch');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'quick_switch'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Demo Switch</span>
            </button>
          )}
        </div>

        {/* Card Body */}
        <div className="bg-stone-800/60 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-stone-700/50">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === 'sign_in' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Broker Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="broker@dubaiagency.ae"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-stone-300">
                    Password
                  </label>
                  <span className="text-[11px] text-amber-400/80 hover:text-amber-300 cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-medium text-sm text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Broker Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-700/50 text-center">
                <p className="text-xs text-stone-400">
                  New to Realtor Buddy?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Apply for Broker Verification
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER BROKER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Rashid Al-Falasi"
                    className="w-full pl-9 pr-3 py-2 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">
                  Agency / Brokerage Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regAgencyName}
                    onChange={(e) => setRegAgencyName(e.target.value)}
                    placeholder="e.g. Emaar Signature Partner"
                    className="w-full pl-9 pr-3 py-2 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="agent@agency.ae"
                    className="w-full px-3 py-2 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    UAE Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    WhatsApp (Client Share)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-500">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={regWhatsApp}
                      onChange={(e) => setRegWhatsApp(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-2 bg-stone-900/80 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Security Gatekeeper Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Wholesale Protection:</strong> To protect confidential developer names and pricing, new registrations undergo 2-hour manual verification by Monil & Edwin.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Broker Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: QUICK DEMO PERSONAS */}
          {activeTab === 'quick_switch' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400 mb-2">
                Instantly authenticate as one of our pre-configured Dubai brokerage personas:
              </p>

              {/* Persona 1: Verified Agent */}
              <button
                type="button"
                onClick={() => handleSelectPreset('agent')}
                className="w-full p-3.5 rounded-xl border border-stone-700/80 bg-stone-900/60 hover:bg-stone-900 hover:border-amber-500/50 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={PRESET_PROFILES.agent.avatar_url}
                    alt="Karim"
                    className="w-10 h-10 rounded-full object-cover border border-amber-500/30"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
                        Karim Al-Sayed
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active Agent
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">Premier Dubai Properties</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </button>

              {/* Persona 2: Admin Gatekeeper */}
              <button
                type="button"
                onClick={() => handleSelectPreset('admin')}
                className="w-full p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/60 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={PRESET_PROFILES.admin.avatar_url}
                    alt="Admin"
                    className="w-10 h-10 rounded-full object-cover border border-amber-400"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
                        Monil & Edwin
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        HQ Admin
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">Platform Gatekeepers & Approvals</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 transition-colors" />
              </button>

              {/* Persona 3: Pending Verification Agent */}
              <button
                type="button"
                onClick={() => handleSelectPreset('pending_agent')}
                className="w-full p-3.5 rounded-xl border border-stone-700/80 bg-stone-900/60 hover:bg-stone-900 hover:border-stone-600 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={PRESET_PROFILES.pending_agent.avatar_url}
                    alt="Rashid"
                    className="w-10 h-10 rounded-full object-cover border border-stone-600"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-stone-100 group-hover:text-amber-400 transition-colors">
                        Rashid Al-Falasi
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pending Verification
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">Emaar Signature Agency</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>
          )}
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            &larr; Return to Dubai Listings Map
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
