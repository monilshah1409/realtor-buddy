import React, { useState, useEffect } from 'react';
import type { Property, Profile, Shortlist } from './types';
import { mockProperties as initialMockProperties } from './data/mockProperties';
import { Navbar, AGENT_PROFILE, ADMIN_PROFILE } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { PropertyForm } from './components/property/PropertyForm';
import { AdminApprovals } from './pages/admin/AdminApprovals';
import { PublicPropertyView } from './pages/public/PublicPropertyView';
import { PublicShortlistView } from './pages/public/PublicShortlistView';
import SubscriptionPage from './pages/auth/SubscriptionPage';
import AuthPage from './pages/auth/AuthPage';
import ProfilePage from './pages/auth/ProfilePage';
import PaywallGate from './components/auth/PaywallGate';
import { FeedbackModal } from './components/feedback/FeedbackModal';
import { FeedbackButton } from './components/feedback/FeedbackButton';
import { DeviceLimitModal } from './components/auth/DeviceLimitModal';
import {
  validateOrRegisterDevice,
  disconnectDevice,
  type UserDeviceSession,
} from './services/sessionService';
import {
  fetchLiveProperties,
  insertLiveProperty,
  updateLivePropertyStatus,
  submitFeedbackComplaint,
  getLocalStoredProperties,
  saveLocalStoredProperty,
} from './services/propertyService';
import { supabase, isLiveSupabase } from './lib/supabase';

export interface AppProps {
  initialPath?: string;
  initialProfile?: Profile;
  initialProperties?: Property[];
}

export function App({
  initialPath,
  initialProfile = AGENT_PROFILE,
  initialProperties,
}: AppProps) {
  // Current route pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (initialPath) return initialPath;
    if (typeof window !== 'undefined' && window.location.pathname) {
      return window.location.pathname;
    }
    return '/';
  });

  // In test environments or when explicitly provided as prop, use test fixtures.
  // In live production, start with clean real data and fetch from Supabase.
  const isTestMode = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';

  // Current authenticated profile
  const [userProfile, setUserProfile] = useState<Profile | null>(() => {
    if (initialProfile) return initialProfile;
    if (isTestMode) return AGENT_PROFILE;
    return null;
  });
  // Initial properties: combine local stored properties with initial mock fixtures so data is never lost on refresh
  const [properties, setProperties] = useState<Property[]>(() => {
    if (initialProperties) return initialProperties;
    const localSaved = getLocalStoredProperties();
    return localSaved.length > 0
      ? [...localSaved, ...initialMockProperties.filter((m) => !localSaved.some((l) => l.id === m.id))]
      : initialMockProperties;
  });

  // Shortlisted property IDs
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(() => {
    return [];
  });

  // Shortlist drawer state
  const [isShortlistDrawerOpen, setIsShortlistDrawerOpen] = useState(false);

  // Global Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Device Concurrency Lock State (Max 3 Devices)
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [activeDeviceSessions, setActiveDeviceSessions] = useState<UserDeviceSession[]>([]);

  // Automatically fetch live properties from Supabase when connected
  useEffect(() => {
    let isMounted = true;
    if (isLiveSupabase()) {
      fetchLiveProperties().then((liveProps) => {
        if (!isMounted) return;
        if (liveProps && liveProps.length > 0) {
          const localSaved = getLocalStoredProperties();
          const liveIds = new Set(liveProps.map((p) => p.id));
          const uniqueLocal = localSaved.filter((p) => !liveIds.has(p.id));
          const uniqueMock = initialMockProperties.filter(
            (m) => !liveIds.has(m.id) && !localSaved.some((l) => l.id === m.id)
          );
          setProperties([...uniqueLocal, ...liveProps, ...uniqueMock]);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Check device concurrency on authenticated routes
  useEffect(() => {
    let isMounted = true;
    if (userProfile && userProfile.id) {
      validateOrRegisterDevice(userProfile.id).then((res) => {
        if (!isMounted) return;
        if (!res.allowed) {
          setIsDeviceBlocked(true);
          setActiveDeviceSessions(res.activeSessions);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [userProfile?.id]);

  const handleDisconnectSession = async (sessionId: string) => {
    await disconnectDevice(sessionId);
    if (userProfile && userProfile.id) {
      const res = await validateOrRegisterDevice(userProfile.id);
      if (res.allowed) {
        setIsDeviceBlocked(false);
      } else {
        setActiveDeviceSessions(res.activeSessions);
      }
    }
  };

  // Client-side navigation handler
  const navigateTo = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({}, '', path);
      } catch {
        // Safe in sandboxed environments
      }
    }
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Shortlist toggle handler
  const handleToggleShortlist = (propertyId: string) => {
    setShortlistedIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleClearShortlist = () => {
    setShortlistedIds([]);
  };

  // Pending verification properties count for admin badge
  const pendingApprovalsCount = properties.filter((p) => p.status === 'private').length;

  // Property creation handler
  const handleCreateProperty = async (propertyData: Partial<Property>) => {
    // Generate valid UUID for Supabase compatibility
    const newUuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `prop-${Date.now()}`;

    const newProperty: Property = {
      id: newUuid,
      title: propertyData.title || 'Dubai Luxury Property',
      description: propertyData.description || '',
      property_type: propertyData.property_type || '2bhk',
      locality: propertyData.locality || 'Downtown Dubai',
      sub_community: propertyData.sub_community,
      handover_status: propertyData.handover_status || 'ready',
      handover_date: propertyData.handover_date || 'Ready',
      price_aed: propertyData.price_aed || 2000000,
      developer_name: propertyData.developer_name || 'Emaar Properties',
      area_sqft: propertyData.area_sqft || 1000,
      bedrooms: propertyData.bedrooms !== undefined ? propertyData.bedrooms : 2,
      bathrooms: propertyData.bathrooms !== undefined ? propertyData.bathrooms : 2,
      latitude: propertyData.latitude || 25.2048,
      longitude: propertyData.longitude || 55.2708,
      photos: propertyData.photos || [],
      brochure_onedrive_url: propertyData.brochure_onedrive_url,
      brochure_file_name: propertyData.brochure_file_name,
      status: 'global', // Visible to the submitting agent immediately on dashboard and public link
      created_by: userProfile?.id || '00000000-0000-0000-0000-000000000001',
      share_token: `share-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Immediately persist to localStorage so it survives any page refresh
    saveLocalStoredProperty(newProperty);

    // 2. Update React in-memory state
    setProperties((prev) => [newProperty, ...prev.filter((p) => p.id !== newProperty.id)]);

    // 3. Persist to live Supabase database
    await insertLiveProperty(newProperty);
    navigateTo('/');
  };

  // Admin approval handlers
  const handleApproveProperty = async (id: string) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, status: 'global' as const };
          saveLocalStoredProperty(updated);
          return updated;
        }
        return p;
      })
    );
    await updateLivePropertyStatus(id, 'global');
  };

  const handleRejectProperty = async (id: string) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, status: 'rejected' as const };
          saveLocalStoredProperty(updated);
          return updated;
        }
        return p;
      })
    );
    await updateLivePropertyStatus(id, 'rejected');
  };

  // Resolve main page content
  const normalizedPath = currentPath.replace(/\/$/, '') || '/';
  let mainContent: React.ReactNode;

  if (isDeviceBlocked) {
    mainContent = (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <DeviceLimitModal
          isOpen={true}
          activeSessions={activeDeviceSessions}
          onDisconnectDevice={handleDisconnectSession}
        />
      </div>
    );
  } else if (normalizedPath.startsWith('/share/')) {
    // 1. Public Unauthenticated Property View: /share/:shareToken
    const token = normalizedPath.replace('/share/', '');
    const matchedProperty =
      properties.find((p) => p.share_token === token || p.id === token) || properties[0];

    mainContent = (
      <PublicPropertyView
        property={matchedProperty}
        agent={userProfile || undefined}
        showBackButton={false}
      />
    );
  } else if (normalizedPath.startsWith('/shortlist/')) {
    // 2. Public Unauthenticated Shortlist View: /shortlist/:shareToken
    const shortlistedProps = properties.filter((p) => shortlistedIds.includes(p.id));
    const displayProperties =
      shortlistedProps.length > 0 ? shortlistedProps : properties.slice(0, 3);

    mainContent = (
      <PublicShortlistView
        properties={displayProperties}
        agent={userProfile || undefined}
        clientName="Valued Client"
        notes="Curated collection of premier properties selected specifically for your Dubai investment portfolio."
      />
    );
  } else if (normalizedPath === '/auth' || normalizedPath === '/login') {
    // 3. Broker Authentication Gateway: /auth or /login
    mainContent = (
      <AuthPage
        onSuccess={(profile) => {
          setUserProfile(profile);
          navigateTo('/');
        }}
        onNavigateHome={() => navigateTo('/')}
      />
    );
  } else if (normalizedPath === '/profile') {
    // 4. Broker Profile Management: /profile
    if (!userProfile) {
      mainContent = (
        <AuthPage
          onSuccess={(profile) => {
            setUserProfile(profile);
            navigateTo('/profile');
          }}
          onNavigateHome={() => navigateTo('/')}
        />
      );
    } else {
      mainContent = (
        <ProfilePage
          userProfile={userProfile}
          onProfileUpdate={(updated) => setUserProfile(updated)}
          onSignOut={() => {
            setUserProfile(null);
            navigateTo('/auth');
          }}
          onNavigate={navigateTo}
        />
      );
    }
  } else if (normalizedPath === '/subscribe') {
    // 5. Subscription Page (Direct Checkout): /subscribe
    mainContent = (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <SubscriptionPage
          userEmail={userProfile?.id ? undefined : 'agent@realtorbuddy.ae'}
          onPaymentInitiated={() => {
            setUserProfile((prev) => (prev ? { ...prev, subscription_status: 'active' } : null));
            navigateTo('/');
          }}
          onNavigate={navigateTo}
        />
      </div>
    );
  } else if (!userProfile && (normalizedPath === '/properties/new' || normalizedPath === '/admin/approvals')) {
    // 6. Unauthenticated Broker Gate: Redirect to Auth
    mainContent = (
      <AuthPage
        onSuccess={(profile) => {
          setUserProfile(profile);
          navigateTo(normalizedPath);
        }}
        onNavigateHome={() => navigateTo('/')}
      />
    );
  } else {
    // 7. Standard Routes (Dashboard & Protected Broker Routes)
    const content = (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
        {/* Navigation Bar */}
        <Navbar
          currentPath={currentPath}
          onNavigate={navigateTo}
          userProfile={userProfile}
          onProfileChange={setUserProfile}
          pendingApprovalsCount={pendingApprovalsCount}
          shortlistCount={shortlistedIds.length}
          onOpenShortlist={() => setIsShortlistDrawerOpen(true)}
        />

        {/* Content Body Based on Current Path */}
        {normalizedPath === '/properties/new' ? (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PropertyForm
              onSubmit={handleCreateProperty}
              onCancel={() => navigateTo('/')}
            />
          </div>
        ) : normalizedPath === '/admin/approvals' ? (
          <div className="flex-1">
            <AdminApprovals
              pendingProperties={properties.filter((p) => p.status === 'private')}
              onApprove={handleApproveProperty}
              onReject={handleRejectProperty}
            />
          </div>
        ) : (
          /* Default: Explore & Map Dashboard */
          <Dashboard
            properties={properties.filter((p) => p.status !== 'rejected')}
            agentProfile={userProfile || undefined}
            shortlistedIds={shortlistedIds}
            onToggleShortlist={handleToggleShortlist}
            onClearShortlist={handleClearShortlist}
            onNavigate={navigateTo}
            isShortlistDrawerOpen={isShortlistDrawerOpen}
            onCloseShortlistDrawer={() => setIsShortlistDrawerOpen(false)}
          />
        )}
      </div>
    );

    // If user is authenticated as an agent with inactive subscription, enforce PaywallGate
    if (userProfile && userProfile.role !== 'admin' && userProfile.subscription_status !== 'active') {
      mainContent = (
        <PaywallGate profile={userProfile} user={{ email: userProfile?.id || 'agent@realtorbuddy.ae' }}>
          {content}
        </PaywallGate>
      );
    } else {
      mainContent = content;
    }
  }

  return (
    <>
      {mainContent}

      {/* Universal Feedback / Complaint Button & Modal (On every page) */}
      <FeedbackButton onClick={() => setIsFeedbackModalOpen(true)} />
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmitFeedback={async (submission) => {
          await submitFeedbackComplaint(submission);
        }}
        userEmail="agent@realtorbuddy.ae"
        userName={userProfile?.full_name || 'Dubai Broker'}
      />
    </>
  );
}

export default App;
