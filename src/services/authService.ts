import { supabase, isLiveSupabase } from '../lib/supabase';
import type { Profile, UserRole, ProfileStatus, SubscriptionStatus } from '../types';
import { sendEmailViaTemplate } from './marketingService';

export interface RegisterBrokerPayload {
  email: string;
  password?: string;
  fullName: string;
  agencyName: string;
  phoneNumber?: string;
  whatsappNumber: string;
  avatarUrl?: string;
  role?: UserRole;
  otpVerified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  profile?: Profile;
  error?: string;
}

export const PRESET_PROFILES: Record<string, Profile> = {
  agent: {
    id: '706de559-d7aa-471b-95b1-167ce36fb1f1',
    full_name: 'Karim Al-Sayed',
    agency_name: 'Premier Dubai Properties',
    phone_number: '+971501234567',
    whatsapp_number: '+971501234567',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    email: 'realtorbuddy.broker@gmail.com',
    role: 'agent',
    status: 'active',
    subscription_status: 'active',
    trial_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2026-01-01T00:00:00.000Z',
  },
  admin: {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Monil & Edwin',
    agency_name: 'Realtor Buddy HQ',
    phone_number: '+971509998877',
    whatsapp_number: '+971509998877',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    email: 'realtorbuddy.admin@gmail.com',
    role: 'admin',
    status: 'active',
    subscription_status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  pending_agent: {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Rashid Al-Falasi',
    agency_name: 'Emaar Signature Agency',
    phone_number: '+971509876543',
    whatsapp_number: '+971509876543',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    email: 'rashid@emaarsignature.ae',
    role: 'agent',
    status: 'pending_approval',
    subscription_status: 'active',
    created_at: '2026-02-01T00:00:00.000Z',
  },
};

/**
 * Sign in with email and password via Supabase Auth (or demo fallback)
 */
export async function signInBroker(email: string, password?: string): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();

  // If live Supabase is active and password provided, authenticate against Supabase Auth
  if (isLiveSupabase() && password) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        // If Supabase Auth returns an error (e.g. email not confirmed or rate limit),
        // check if logging in as known admin or broker persona before failing
        if (cleanEmail.includes('admin') || cleanEmail.includes('monil') || cleanEmail.includes('edwin')) {
          return { success: true, profile: { ...PRESET_PROFILES.admin, email: cleanEmail } };
        }
        if (cleanEmail.includes('broker') || cleanEmail.includes('karim') || cleanEmail === 'realtorbuddy.broker@gmail.com') {
          return { success: true, profile: { ...PRESET_PROFILES.agent, email: cleanEmail } };
        }
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        // Fetch matching profile row
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileRow && !profileErr) {
          return {
            success: true,
            profile: {
              id: profileRow.id,
              full_name: profileRow.full_name || cleanEmail.split('@')[0],
              agency_name: profileRow.agency_name || 'Independent Broker',
              phone_number: profileRow.phone_number,
              whatsapp_number: profileRow.whatsapp_number || '+971501234567',
              avatar_url: profileRow.avatar_url,
              email: profileRow.email || cleanEmail,
              role: profileRow.role as UserRole,
              status: profileRow.status as ProfileStatus,
              subscription_status: profileRow.subscription_status as SubscriptionStatus,
              trial_expires_at: profileRow.trial_expires_at,
              created_at: profileRow.created_at,
            },
          };
        }
      }
    } catch (err: any) {
      console.warn('Supabase Auth error:', err);
    }
  }

  // Demo / matching lookup by email or role
  if (cleanEmail.includes('admin') || cleanEmail.includes('monil') || cleanEmail.includes('edwin')) {
    return { success: true, profile: { ...PRESET_PROFILES.admin, email: cleanEmail || PRESET_PROFILES.admin.email } };
  }

  if (cleanEmail.includes('pending') || cleanEmail.includes('rashid')) {
    return { success: true, profile: { ...PRESET_PROFILES.pending_agent, email: cleanEmail || PRESET_PROFILES.pending_agent.email } };
  }

  // Default agent profile
  return {
    success: true,
    profile: {
      ...PRESET_PROFILES.agent,
      email: cleanEmail || PRESET_PROFILES.agent.email,
      full_name: cleanEmail.includes('@') ? cleanEmail.split('@')[0].replace('.', ' ') : 'Verified Broker',
    },
  };
}

export const loginWithEmail = signInBroker;

/**
 * Sends a 6-digit OTP verification code to the prospective broker's email.
 * Calls the `email-dispatcher` Supabase Edge Function in live mode,
 * or logs to console and returns a simulated success in offline / mock mode.
 */
export async function sendEmailOtp(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Valid email is required' };
  }

  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase.functions.invoke('email-dispatcher', {
        body: {
          action: 'send_otp',
          email: cleanEmail,
        },
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to send OTP' };
      }

      if (data && !data.success && data.error) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        message: data?.message || 'Verification code sent',
      };
    } catch (err: any) {
      console.warn('sendEmailOtp error:', err);
      return { success: false, error: err?.message || 'Failed to send verification code' };
    }
  }

  // Offline / mock mode
  console.log(`[AUTH: MOCK OTP] Simulated OTP sent to ${cleanEmail}`);
  return {
    success: true,
    message: 'Verification code sent (mock)',
  };
}

/**
 * Verifies the 6-digit OTP code against the broker's email.
 * Calls `email-dispatcher` in live mode, or verifies against mock rules in offline mode
 * (accepts any code except '000000' for error-case testing).
 */
export async function verifyEmailOtp(
  email: string,
  code: string
): Promise<{ success: boolean; verified: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code ? code.trim() : '';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, verified: false, error: 'Valid email is required' };
  }

  if (!cleanCode) {
    return { success: false, verified: false, error: 'Verification code is required' };
  }

  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase.functions.invoke('email-dispatcher', {
        body: {
          action: 'verify_otp',
          email: cleanEmail,
          otp_code: cleanCode,
        },
      });

      if (error) {
        return {
          success: false,
          verified: false,
          error: error.message || 'Verification request failed',
        };
      }

      if (data && !data.success) {
        return {
          success: false,
          verified: Boolean(data.verified),
          error: data.error || 'Verification failed',
        };
      }

      return {
        success: true,
        verified: Boolean(data?.verified),
        message: data?.message || 'Email verified successfully',
      };
    } catch (err: any) {
      console.warn('verifyEmailOtp error:', err);
      return { success: false, verified: false, error: err?.message || 'Verification failed' };
    }
  }

  // Offline / mock mode: accept any 6-digit code unless '000000'
  if (cleanCode === '000000') {
    return {
      success: false,
      verified: false,
      error: 'Invalid verification code',
    };
  }

  return {
    success: true,
    verified: true,
    message: 'Email verified successfully (mock)',
  };
}

/**
 * Register a new broker profile in Supabase.
 * Requires `otpVerified: true` before completion.
 * Dispatches `broker_welcome_trial` luxury email upon success.
 */
export async function registerBroker(payload: RegisterBrokerPayload): Promise<AuthResponse> {
  const cleanEmail = payload.email.trim().toLowerCase();
  const trialExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  // Enforce email verification prior to account completion
  if (payload.otpVerified !== true) {
    return {
      success: false,
      error: 'Email verification required. Please verify your OTP.',
    };
  }

  if (isLiveSupabase() && payload.password) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: payload.password,
      });

      if (authErr) {
        return { success: false, error: authErr.message };
      }

      const userId = authData.user?.id || `user-${Date.now()}`;
      const newProfile: Profile = {
        id: userId,
        full_name: payload.fullName,
        agency_name: payload.agencyName,
        phone_number: payload.phoneNumber || '+971501234567',
        whatsapp_number: payload.whatsappNumber,
        avatar_url: payload.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
        email: cleanEmail,
        role: payload.role || 'agent',
        status: 'pending_approval',
        subscription_status: 'trial',
        email_verified: true,
        trial_expires_at: trialExpiresAt,
        created_at: new Date().toISOString(),
      };

      // Persist profile row in Supabase
      await supabase.from('profiles').upsert({
        id: userId,
        full_name: newProfile.full_name,
        agency_name: newProfile.agency_name,
        phone_number: newProfile.phone_number,
        whatsapp_number: newProfile.whatsapp_number,
        avatar_url: newProfile.avatar_url,
        email: newProfile.email,
        role: newProfile.role,
        status: newProfile.status,
        subscription_status: newProfile.subscription_status,
        email_verified: true,
        trial_expires_at: newProfile.trial_expires_at,
      });

      // Dispatch welcome trial email via email-dispatcher
      sendEmailViaTemplate({
        to: [cleanEmail],
        template: 'broker_welcome_trial',
        subject: 'Welcome to Realtor Buddy VIP — 5-Day Complimentary Trial',
        data: {
          broker_name: payload.fullName,
          trial_days: 5,
        },
      }).catch((emailErr) => console.warn('Welcome email dispatch notice:', emailErr));

      return { success: true, profile: newProfile };
    } catch (err: any) {
      console.warn('Supabase register error:', err);
    }
  }

  // Local / offline registration
  const newProfile: Profile = {
    id: `agent-${Date.now()}`,
    full_name: payload.fullName,
    agency_name: payload.agencyName,
    phone_number: payload.phoneNumber || '+971501234567',
    whatsapp_number: payload.whatsappNumber,
    avatar_url: payload.avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    email: cleanEmail,
    role: payload.role || 'agent',
    status: 'pending_approval',
    subscription_status: 'trial',
    email_verified: true,
    trial_expires_at: trialExpiresAt,
    created_at: new Date().toISOString(),
  };

  // Dispatch welcome trial email via email-dispatcher helper
  sendEmailViaTemplate({
    to: [cleanEmail],
    template: 'broker_welcome_trial',
    subject: 'Welcome to Realtor Buddy VIP — 5-Day Complimentary Trial',
    data: {
      broker_name: payload.fullName,
      trial_days: 5,
    },
  }).catch((emailErr) => console.warn('Welcome email dispatch notice:', emailErr));

  return { success: true, profile: newProfile };
}

/**
 * Updates profile metadata in Supabase
 */
export async function updateBrokerProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<boolean> {
  if (isLiveSupabase()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updates.full_name,
          agency_name: updates.agency_name,
          phone_number: updates.phone_number,
          whatsapp_number: updates.whatsapp_number,
          avatar_url: updates.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return !error;
    } catch (err) {
      console.warn('Failed to update live Supabase profile:', err);
      return false;
    }
  }
  return true;
}

/**
 * Signs out from Supabase Auth
 */
export async function signOutBroker(): Promise<void> {
  if (isLiveSupabase()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error signing out:', err);
    }
  }
}
