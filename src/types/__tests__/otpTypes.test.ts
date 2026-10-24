import { describe, it, expect } from 'vitest';
import type { Profile, BrokerOtp } from '../index';

describe('Broker OTP and Profile Types', () => {
  it('supports email_verified on Profile interface', () => {
    const profile: Profile = {
      id: 'broker-123',
      full_name: 'Zaid Al-Harbi',
      agency_name: 'Emaar Signature',
      phone_number: '+971501234567',
      whatsapp_number: '+971501234567',
      email: 'zaid@emaar.ae',
      role: 'agent',
      status: 'active',
      subscription_status: 'trial',
      email_verified: true,
      trial_expires_at: '2026-10-29T12:00:00.000Z',
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(profile.email_verified).toBe(true);
  });

  it('validates BrokerOtp interface attributes', () => {
    const otpRecord: BrokerOtp = {
      id: 'otp-uuid-1',
      email: 'zaid@emaar.ae',
      otp_code: '492817',
      purpose: 'verification',
      attempts: 0,
      max_attempts: 5,
      expires_at: '2026-10-24T12:10:00.000Z',
      consumed_at: null,
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(otpRecord.otp_code).toBe('492817');
    expect(otpRecord.max_attempts).toBe(5);
  });
});
