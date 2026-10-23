import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateOrRegisterDevice,
  disconnectDevice,
  getActiveSessions,
  MAX_ACTIVE_DEVICES,
  _resetMockSessions,
  type UserDeviceSession,
} from '../sessionService';

describe('sessionService (Device Concurrency Lock)', () => {
  const userId = 'user-agent-123';

  beforeEach(() => {
    _resetMockSessions([]);
  });

  it('allows registration when under the 3 device limit', async () => {
    const res1 = await validateOrRegisterDevice(userId, 'token-device-1', {
      deviceName: 'MacBook Pro',
      browser: 'Chrome',
      os: 'macOS',
    });

    expect(res1.allowed).toBe(true);
    expect(res1.reason).toBe('new_registered');
    expect(res1.activeSessions.length).toBe(1);

    const res2 = await validateOrRegisterDevice(userId, 'token-device-2', {
      deviceName: 'iPhone 15',
      browser: 'Safari',
      os: 'iOS',
    });

    expect(res2.allowed).toBe(true);
    expect(res2.activeSessions.length).toBe(2);

    const res3 = await validateOrRegisterDevice(userId, 'token-device-3', {
      deviceName: 'iPad Pro',
      browser: 'Safari',
      os: 'iOS',
    });

    expect(res3.allowed).toBe(true);
    expect(res3.activeSessions.length).toBe(3);
  });

  it('blocks a 4th device when 3 devices are already active', async () => {
    // Register 3 active devices
    await validateOrRegisterDevice(userId, 'token-device-1');
    await validateOrRegisterDevice(userId, 'token-device-2');
    await validateOrRegisterDevice(userId, 'token-device-3');

    // Attempt 4th device registration
    const res4 = await validateOrRegisterDevice(userId, 'token-device-4', {
      deviceName: 'Office Windows PC',
    });

    expect(res4.allowed).toBe(false);
    expect(res4.reason).toBe('limit_reached');
    expect(res4.activeSessions.length).toBe(MAX_ACTIVE_DEVICES);
  });

  it('allows an existing active device even when count is 3', async () => {
    await validateOrRegisterDevice(userId, 'token-device-1');
    await validateOrRegisterDevice(userId, 'token-device-2');
    await validateOrRegisterDevice(userId, 'token-device-3');

    // Re-visiting with existing device token-device-2
    const res = await validateOrRegisterDevice(userId, 'token-device-2');
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe('active_existing');
  });

  it('unblocks the 4th device once a device is disconnected', async () => {
    const s1 = await validateOrRegisterDevice(userId, 'token-device-1');
    await validateOrRegisterDevice(userId, 'token-device-2');
    await validateOrRegisterDevice(userId, 'token-device-3');

    const blocked = await validateOrRegisterDevice(userId, 'token-device-4');
    expect(blocked.allowed).toBe(false);

    // Disconnect device 1
    const sessionIdToDisconnect = s1.currentSessionId!;
    await disconnectDevice(sessionIdToDisconnect);

    // Retry 4th device registration
    const retry = await validateOrRegisterDevice(userId, 'token-device-4');
    expect(retry.allowed).toBe(true);
    expect(retry.reason).toBe('new_registered');
    expect(retry.activeSessions.length).toBe(3);
  });
});
