import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Bookmark,
  User,
  CheckCircle,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { Profile, UserRole } from '../../types';

export interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userProfile: Profile;
  onProfileChange: (profile: Profile) => void;
  pendingApprovalsCount?: number;
  shortlistCount?: number;
  onOpenShortlist?: () => void;
  className?: string;
}

export const AGENT_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000002',
  full_name: 'Karim Al-Sayed',
  agency_name: 'Premier Dubai Properties',
  phone_number: '+971501234567',
  whatsapp_number: '+971501234567',
  avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
  role: 'agent',
  status: 'active',
  subscription_status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const ADMIN_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Monil & Edwin',
  agency_name: 'Realtor Buddy HQ',
  phone_number: '+971500000001',
  whatsapp_number: '+971500000001',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  role: 'admin',
  status: 'active',
  subscription_status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
};

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  userProfile,
  onProfileChange,
  pendingApprovalsCount = 0,
  shortlistCount = 0,
  onOpenShortlist,
  className = '',
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [logoAvailable, setLogoAvailable] = useState<boolean | null>(null);

  const isAdmin = userProfile.role === 'admin';

  const handleRoleSwitch = (newRole: UserRole) => {
    if (newRole === 'admin') {
      onProfileChange(ADMIN_PROFILE);
    } else {
      onProfileChange(AGENT_PROFILE);
    }
    setIsRoleDropdownOpen(false);
  };

  const navLinks = [
    {
      name: 'Browse & Map',
      path: '/',
      icon: MapPin,
      show: true,
    },
    {
      name: 'Add Property',
      path: '/properties/new',
      icon: PlusCircle,
      show: true,
    },
    {
      name: 'Approvals',
      path: '/admin/approvals',
      icon: ShieldCheck,
      show: isAdmin,
      pill: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
    },
  ];

  return (
    <header className={`bg-white/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-40 shadow-xs ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Dubai Badge */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 focus:outline-hidden group text-left cursor-pointer"
              aria-label="Realtor Buddy Home"
            >
              {logoAvailable !== false && (
                <img
                  src="/logo.png"
                  alt="Realtor Buddy"
                  onLoad={() => setLogoAvailable(true)}
                  onError={() => setLogoAvailable(false)}
                  className={`h-9 sm:h-10 w-auto max-w-[200px] object-contain group-hover:scale-105 transition-transform ${
                    logoAvailable === true ? 'block' : 'hidden'
                  }`}
                />
              )}

              {/* Default Brand Mark & Typography (Active when full logo image is not loaded or during fallback) */}
              <div className={`flex items-center gap-2.5 ${logoAvailable === true ? 'hidden' : 'flex'}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center text-amber-400 border border-amber-500/30 shadow-md group-hover:border-amber-400 transition-all shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif text-xl font-bold tracking-tight text-slate-900 group-hover:text-amber-800 transition-colors">
                      Realtor Buddy
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-900 border border-amber-200/80">
                      Dubai
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                    Verified Broker Network
                  </span>
                </div>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
              {navLinks
                .filter((link) => link.show)
                .map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    link.path === '/'
                      ? currentPath === '/' || currentPath === '/dashboard'
                      : currentPath.startsWith(link.path);

                  return (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => onNavigate(link.path)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>{link.name}</span>
                      {link.pill !== null && link.pill !== undefined && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                          {link.pill}
                        </span>
                      )}
                    </button>
                  );
                })}

              {/* My Shortlists Navigation Button */}
              <button
                type="button"
                onClick={onOpenShortlist}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all relative cursor-pointer"
                aria-label="My Shortlists"
              >
                <Bookmark className="w-4 h-4 text-slate-400" />
                <span>My Shortlists</span>
                {shortlistCount > 0 && (
                  <span
                    data-testid="shortlist-nav-count"
                    className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950"
                  >
                    {shortlistCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Right: Quick Role Switcher & User Profile Badges */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Subscription Active Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 shadow-2xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Subscription Active</span>
            </div>

            {/* Role Switcher Pill Dropdown */}
            <div className="relative">
              <button
                type="button"
                data-testid="role-switcher-button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 transition-all bg-white shadow-2xs text-left cursor-pointer"
                aria-expanded={isRoleDropdownOpen}
                aria-haspopup="true"
              >
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-stone-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-300 font-bold flex items-center justify-center text-xs">
                    {userProfile.full_name.charAt(0)}
                  </div>
                )}

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {userProfile.full_name}
                    </span>
                    <span
                      data-testid="profile-role-badge"
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-slate-900 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isAdmin ? 'Admin' : 'Agent'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {userProfile.agency_name}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              {/* Role Switcher Dropdown Menu */}
              {isRoleDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                  data-testid="role-switcher-dropdown"
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Switch Role Mode (Demo)
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Toggle between agent discovery and platform administrator verification.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('agent')}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      !isAdmin
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                        A
                      </div>
                      <div>
                        <div className="text-xs font-bold">Agent View</div>
                        <div className="text-[10px] text-slate-400">Karim Al-Sayed • Premier Dubai</div>
                      </div>
                    </div>
                    {!isAdmin && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('admin')}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-colors mt-1 ${
                      isAdmin
                        ? 'bg-purple-50 text-purple-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                        M
                      </div>
                      <div>
                        <div className="text-xs font-bold">Admin View (Monil & Edwin)</div>
                        <div className="text-[10px] text-slate-400">Verification & Approvals</div>
                      </div>
                    </div>
                    {isAdmin && <CheckCircle className="w-4 h-4 text-purple-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('/profile');
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>My Broker Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('/auth');
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full text-left p-2 rounded-lg flex items-center gap-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sign In / Switch Persona</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onOpenShortlist}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg relative"
              aria-label="Shortlist"
            >
              <Bookmark className="w-5 h-5" />
              {shortlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {shortlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.path === '/'
                    ? currentPath === '/' || currentPath === '/dashboard'
                    : currentPath.startsWith(link.path);

                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => {
                      onNavigate(link.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl text-sm font-bold ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-5 h-5 text-emerald-600" />
                      <span>{link.name}</span>
                    </div>
                    {link.pill !== null && link.pill !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                        {link.pill}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>

          {/* Mobile Role Switcher */}
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              Role Switcher (Demo)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleRoleSwitch('agent');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                  !isAdmin
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                Agent View
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRoleSwitch('admin');
                  setIsMobileMenuOpen(false);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                  isAdmin
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                Admin (Monil & Edwin)
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate('/profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-medium border border-stone-200 bg-stone-50 text-slate-800 text-center"
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('/auth');
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-medium border border-amber-200 bg-amber-50 text-amber-900 text-center"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
