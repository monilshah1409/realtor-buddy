import { describe, it, expect } from 'vitest';
import { mockProperties } from '../../data/mockProperties';
import { DUBAI_CLUSTERS } from '../../data/dubaiClusters';
import type {
  Property,
  Profile,
  PaymentTransaction,
  PromoCoupon,
  MarketingCampaign,
  EmailLog,
} from '../index';

describe('Core Data & Types', () => {
  it('has valid mock properties with required Dubai real estate fields', () => {
    expect(mockProperties.length).toBeGreaterThanOrEqual(4);
    const first = mockProperties[0];
    expect(first.locality).toBeDefined();
    expect(first.handover_status).toBeDefined();
    expect(first.handover_date).toBeDefined();
    expect(first.price_aed).toBeGreaterThan(0);
  });

  it('contains primary Dubai locality clusters', () => {
    expect(DUBAI_CLUSTERS['Downtown Dubai']).toContain('Business Bay');
    expect(DUBAI_CLUSTERS['Dubai Marina']).toContain('JLT');
  });

  it('supports trial_expires_at and email on Profile interface', () => {
    const profile: Profile = {
      id: 'test-id',
      full_name: 'Karim Al-Sayed',
      agency_name: 'Premier Properties',
      whatsapp_number: '+971501234567',
      email: 'karim@dubairealty.ae',
      role: 'agent',
      status: 'active',
      subscription_status: 'trial',
      trial_expires_at: '2026-10-29T12:00:00.000Z',
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(profile.trial_expires_at).toBeDefined();
    expect(profile.email).toBe('karim@dubairealty.ae');
  });

  it('supports PaymentTransaction domain model', () => {
    const tx: PaymentTransaction = {
      id: 'tx-123',
      user_id: 'user-456',
      user_email: 'karim@dubairealty.ae',
      amount_aed: 149,
      plan_id: 'monthly',
      promo_code: 'SPECIAL20',
      payment_gateway: 'ziina',
      gateway_session_id: 'sess_123',
      status: 'completed',
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(tx.amount_aed).toBe(149);
    expect(tx.status).toBe('completed');
  });

  it('supports PromoCoupon domain model with usage caps', () => {
    const coupon: PromoCoupon = {
      id: 'coupon-1',
      code: 'VIP100',
      discount_type: 'fixed_aed',
      discount_value: 100,
      description: '100 AED Flat VIP Voucher',
      is_active: true,
      max_uses: 100,
      times_redeemed: 5,
      valid_until: '2026-12-31T23:59:59.000Z',
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(coupon.max_uses).toBe(100);
    expect(coupon.times_redeemed).toBe(5);
  });

  it('supports MarketingCampaign and EmailLog domain models', () => {
    const campaign: MarketingCampaign = {
      id: 'camp-1',
      title: 'Trial Day 3 Feature Discovery',
      trigger_type: 'trial_day_3',
      subject: 'Discover Wholesale Pricing & Exporting',
      content_html: '<p>Welcome</p>',
      is_active: true,
      audience: 'trial',
      created_at: '2026-10-24T12:00:00.000Z',
    };
    expect(campaign.trigger_type).toBe('trial_day_3');

    const log: EmailLog = {
      id: 'log-1',
      user_id: 'user-456',
      recipient_email: 'karim@dubairealty.ae',
      campaign_type: 'trial_day_3',
      subject: 'Discover Wholesale Pricing',
      status: 'sent',
      sent_at: '2026-10-24T12:00:00.000Z',
    };
    expect(log.recipient_email).toBe('karim@dubairealty.ae');
  });
});

