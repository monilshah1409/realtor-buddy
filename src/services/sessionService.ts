import { supabase } from '../lib/supabase';

export interface UserDeviceSession {
  id: string;
  user_id: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address?: string;
  session_token: string;
  last_active_at: string;
  is_active: boolean;
  created_at: string;
}

export const MAX_ACTIVE_DEVICES = 3;
export const DEVICE_TOKEN_STORAGE_KEY = 'realtor_buddy_device_token';

/**
 * Detect client browser, OS, and friendly device description.
 */
export function getClientDeviceInfo(): {
  deviceName: string;
  browser: string;
  os: string;
} {
  if (typeof window === 'undefined' || !navigator?.userAgent) {
    return {
      deviceName: 'Desktop Web Workstation',
      browser: 'Chrome',
      os: 'macOS',
    };
  }

  const ua = navigator.userAgent;

  // OS Detection
  let os = 'Unknown OS';
  if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Linux/.test(ua)) os = 'Linux';

  // Browser Detection
  let browser = 'Browser';
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';

  // Device friendly description
  let deviceName = `${os} (${browser})`;
  if (/iPad/.test(ua)) deviceName = 'Apple iPad';
  else if (/iPhone/.test(ua)) deviceName = 'Apple iPhone';
  else if (/Android/.test(ua)) deviceName = 'Android Device';
  else if (/Macintosh/.test(ua)) deviceName = 'Apple Mac';
  else if (/Windows/.test(ua)) deviceName = 'Windows PC';

  return { deviceName, browser, os };
}

/**
 * Gets or creates persistent device token in client storage.
 */
export function getOrCreateDeviceToken(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'mock-device-token';
  }

  let token = window.localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  if (!token) {
    token = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    window.localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
  }
  return token;
}

// In-memory sessions store fallback for mock / offline testing
let inMemorySessionsStore: UserDeviceSession[] = [
  {
    id: 'sess-mac-office',
    user_id: '00000000-0000-0000-0000-000000000002',
    device_name: 'Apple MacBook Pro 16"',
    browser: 'Google Chrome',
    os: 'macOS',
    session_token: 'dev_mac_office_token',
    last_active_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'sess-iphone-personal',
    user_id: '00000000-0000-0000-0000-000000000002',
    device_name: 'Apple iPhone 15 Pro',
    browser: 'Apple Safari',
    os: 'iOS',
    session_token: 'dev_iphone_token',
    last_active_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'sess-ipad-client',
    user_id: '00000000-0000-0000-0000-000000000002',
    device_name: 'Apple iPad Pro 13-inch',
    browser: 'Apple Safari',
    os: 'iOS',
    session_token: 'dev_ipad_token',
    last_active_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

/**
 * Resets the in-memory session store (used in testing).
 */
export function _resetMockSessions(sessions?: UserDeviceSession[]) {
  if (sessions) {
    inMemorySessionsStore = [...sessions];
  } else {
    inMemorySessionsStore = [];
  }
}

function isLiveSupabase(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
    return false;
  }
  const url = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : undefined;
  return Boolean(url && !url.includes('placeholder'));
}

/**
 * Fetch all currently active sessions for a user.
 */
export async function getActiveSessions(userId: string): Promise<UserDeviceSession[]> {
  if (isLiveSupabase()) {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_active_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as UserDeviceSession[];
      }
    } catch {
      // Fall back to in-memory store
    }
  }

  return inMemorySessionsStore.filter(
    (s) => s.user_id === userId && s.is_active
  );
}

export interface SessionValidationResult {
  allowed: boolean;
  activeSessions: UserDeviceSession[];
  currentSessionId?: string;
  reason?: 'limit_reached' | 'active_existing' | 'new_registered';
}

/**
 * Validates whether the current device is allowed to access the application.
 * If 3 devices are already active and this device is not one of them, blocks access.
 */
export async function validateOrRegisterDevice(
  userId: string,
  deviceToken: string = getOrCreateDeviceToken(),
  deviceInfo: { deviceName?: string; browser?: string; os?: string } = getClientDeviceInfo()
): Promise<SessionValidationResult> {
  const activeSessions = await getActiveSessions(userId);

  // 1. Check if this device token is already among active sessions
  const existingSession = activeSessions.find(
    (s) => s.session_token === deviceToken
  );

  if (existingSession) {
    existingSession.last_active_at = new Date().toISOString();
    return {
      allowed: true,
      activeSessions,
      currentSessionId: existingSession.id,
      reason: 'active_existing',
    };
  }

  // 2. Check if active device limit is reached (3 devices)
  if (activeSessions.length >= MAX_ACTIVE_DEVICES) {
    return {
      allowed: false,
      activeSessions,
      reason: 'limit_reached',
    };
  }

  // 3. Register new device session
  const newSession: UserDeviceSession = {
    id: `sess-${Date.now()}`,
    user_id: userId,
    device_name: deviceInfo.deviceName || 'Web Device',
    browser: deviceInfo.browser || 'Browser',
    os: deviceInfo.os || 'OS',
    session_token: deviceToken,
    last_active_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  };

  if (isLiveSupabase()) {
    try {
      await supabase.from('user_sessions').insert(newSession);
    } catch {
      // In-memory fallback
    }
  }

  inMemorySessionsStore.push(newSession);

  return {
    allowed: true,
    activeSessions: [...activeSessions, newSession],
    currentSessionId: newSession.id,
    reason: 'new_registered',
  };
}

/**
 * Disconnects / revokes an active device session.
 */
export async function disconnectDevice(sessionId: string): Promise<boolean> {
  if (isLiveSupabase()) {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
    } catch {
      // Fallback below
    }
  }

  const idx = inMemorySessionsStore.findIndex((s) => s.id === sessionId);
  if (idx !== -1) {
    inMemorySessionsStore[idx].is_active = false;
    return true;
  }

  return false;
}
