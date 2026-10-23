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
import PaywallGate from './components/auth/PaywallGate';
import { FeedbackModal } from './components/feedback/FeedbackModal';
import { FeedbackButton } from './components/feedback/FeedbackButton';
import { DeviceLimitModal } from './components/auth/DeviceLimitModal';
import {
  validateOrRegisterDevice,
  disconnectDevice,
  type UserDeviceSession,
} from './services/sessionService';

export interface AppProps {
  initialPath?: string;
  initialProfile?: Profile;
  initialProperties?: Property[];
}

export function App({
  initialPath,
  initialProfile = AGENT_PROFILE,
  initialProperties = initialMockProperties,
}: AppProps) {
  // Current route pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (initialPath) return initialPath;
    if (typeof window !== 'undefined' && window.location.pathname) {
      return window.location.pathname;
    }
    return '/';
  });

  // Current authenticated profile
  const [userProfile, setUserProfile] = useState<Profile>(initialProfile);

  // Application properties collection
  const [properties, setProperties] = useState<Property[]>(initialProperties);

  // Shortlisted property IDs
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(() => [
    initialProperties[0]?.id || 'prop-1',
  ]);

  // Shortlist drawer state
  const [isShortlistDrawerOpen, setIsShortlistDrawerOpen] = useState(false);

  // Global Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Device Concurrency Lock State (Max 3 Devices)
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [activeDeviceSessions, setActiveDeviceSessions] = useState<UserDeviceSession[]>([]);

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
    const newId = `prop-${Date.now()}`;
    const newProperty: Property = {
      id: newId,
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
      status: 'private', // Agent submissions begin in private status pending admin verification
      created_by: userProfile.id,
      share_token: `share-${newId}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProperties((prev) => [newProperty, ...prev]);
    navigateTo('/');
  };

  // Admin approval handlers
  const handleApproveProperty = (id: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'global' as const } : p))
    );
  };

  const handleRejectProperty = (id: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'rejected' as const } : p))
    );
  };

  // Resolve main page content
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
  } else if (currentPath.startsWith('/share/')) {
    // 1. Public Unauthenticated Property View: /share/:shareToken
    const token = currentPath.replace('/share/', '');
    const matchedProperty =
      properties.find((p) => p.share_token === token || p.id === token) || properties[0];

    mainContent = (
      <PublicPropertyView
        property={matchedProperty}
        agent={userProfile}
        showBackButton={false}
      />
    );
  } else if (currentPath.startsWith('/shortlist/')) {
    // 2. Public Unauthenticated Shortlist View: /shortlist/:shareToken
    const shortlistedProps = properties.filter((p) => shortlistedIds.includes(p.id));
    const displayProperties =
      shortlistedProps.length > 0 ? shortlistedProps : properties.slice(0, 3);

    mainContent = (
      <PublicShortlistView
        properties={displayProperties}
        agent={userProfile}
        clientName="Valued Client"
        notes="Curated collection of premier properties selected specifically for your Dubai investment portfolio."
      />
    );
  } else if (currentPath === '/subscribe') {
    // 3. Subscription Page (Direct Checkout): /subscribe
    mainContent = (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <SubscriptionPage
          userEmail="agent@realtorbuddy.ae"
          onPaymentInitiated={() => {
            setUserProfile((prev) => ({
              ...prev,
              subscription_status: 'active',
            }));
            navigateTo('/');
          }}
        />
      </div>
    );
  } else {
    // 4. Protected Routes (Wrapped in PaywallGate & displaying Navbar)
    mainContent = (
      <PaywallGate profile={userProfile} user={{ email: 'agent@realtorbuddy.ae' }}>
        <div className="min-h-screen bg-slate-50 flex flex-col">
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
          {currentPath === '/properties/new' ? (
            <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <PropertyForm
                onSubmit={handleCreateProperty}
                onCancel={() => navigateTo('/')}
              />
            </div>
          ) : currentPath === '/admin/approvals' ? (
            <div className="flex-1">
              <AdminApprovals
                pendingProperties={properties.filter((p) => p.status === 'private')}
                onApprove={handleApproveProperty}
                onReject={handleRejectProperty}
              />
            </div>
          ) : (
            /* Default: Agent Dashboard (Browse & Map) */
            <Dashboard
              properties={properties.filter((p) => p.status !== 'rejected')}
              agentProfile={userProfile}
              shortlistedIds={shortlistedIds}
              onToggleShortlist={handleToggleShortlist}
              onClearShortlist={handleClearShortlist}
              onNavigate={navigateTo}
              isShortlistDrawerOpen={isShortlistDrawerOpen}
              onCloseShortlistDrawer={() => setIsShortlistDrawerOpen(false)}
            />
          )}
        </div>
      </PaywallGate>
    );
  }

  return (
    <>
      {mainContent}

      {/* Universal Feedback / Complaint Button & Modal (On every page) */}
      <FeedbackButton onClick={() => setIsFeedbackModalOpen(true)} />
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        userEmail="agent@realtorbuddy.ae"
        userName={userProfile?.full_name || 'Dubai Broker'}
      />
    </>
  );
}

export default App;
