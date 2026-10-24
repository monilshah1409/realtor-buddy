import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchMarketingCampaigns,
  toggleMarketingCampaign,
  fetchAdminPromos,
  createAdminPromo,
  toggleAdminPromo,
  extendBrokerTrial,
  sendBroadcastEmail,
  fetchRevenueMetrics,
  resetMarketingStore,
} from '../marketingService';
import { Profile } from '../../types';

describe('marketingService', () => {
  beforeEach(() => {
    resetMarketingStore();
    vi.restoreAllMocks();
  });

  describe('fetchMarketingCampaigns & toggleMarketingCampaign', () => {
    it('returns pre-set drip triggers: trial_day_3, trial_expiring_24h, trial_expired_winback', async () => {
      const campaigns = await fetchMarketingCampaigns();
      expect(campaigns).toBeDefined();
      expect(campaigns.length).toBeGreaterThanOrEqual(3);

      const triggerTypes = campaigns.map((c) => c.trigger_type);
      expect(triggerTypes).toContain('trial_day_3');
      expect(triggerTypes).toContain('trial_expiring_24h');
      expect(triggerTypes).toContain('trial_expired_winback');

      const day3 = campaigns.find((c) => c.trigger_type === 'trial_day_3');
      expect(day3?.title).toMatch(/day 3/i);
      expect(day3?.is_active).toBe(true);
      expect(day3?.subject).toBeDefined();
    });

    it('toggles campaign is_active status and persists to subsequent fetches', async () => {
      const campaignsBefore = await fetchMarketingCampaigns();
      const target = campaignsBefore[0];
      const initialStatus = target.is_active;

      const success = await toggleMarketingCampaign(target.id, !initialStatus);
      expect(success).toBe(true);

      const campaignsAfter = await fetchMarketingCampaigns();
      const updated = campaignsAfter.find((c) => c.id === target.id);
      expect(updated?.is_active).toBe(!initialStatus);
    });

    it('returns false when toggling a non-existent campaign', async () => {
      const success = await toggleMarketingCampaign('non-existent-campaign-id', false);
      expect(success).toBe(false);
    });
  });

  describe('fetchAdminPromos, createAdminPromo & toggleAdminPromo', () => {
    it('returns default seed promos including SPECIAL20, WELCOME50, and EARLYBIRD', async () => {
      const promos = await fetchAdminPromos();
      expect(promos).toBeDefined();
      expect(promos.length).toBeGreaterThanOrEqual(3);

      const codes = promos.map((p) => p.code);
      expect(codes).toContain('SPECIAL20');
      expect(codes).toContain('WELCOME50');
      expect(codes).toContain('EARLYBIRD');

      const special20 = promos.find((p) => p.code === 'SPECIAL20');
      expect(special20?.discount_type).toBe('percentage');
      expect(special20?.discount_value).toBe(20);
      expect(special20?.max_uses).toBeGreaterThan(0);
      expect(special20?.times_redeemed).toBeGreaterThanOrEqual(0);
    });

    it('creates promo vouchers with uppercase sanitized codes and default metrics', async () => {
      const newPromo = await createAdminPromo({
        code: '  dubai_vip40  ',
        discount_type: 'percentage',
        discount_value: 40,
        description: '40% Broker Launch Discount',
        is_active: true,
        max_uses: 25,
      });

      expect(newPromo.id).toBeDefined();
      expect(newPromo.code).toBe('DUBAI_VIP40');
      expect(newPromo.times_redeemed).toBe(0);
      expect(newPromo.max_uses).toBe(25);
      expect(newPromo.created_at).toBeDefined();

      const allPromos = await fetchAdminPromos();
      const found = allPromos.find((p) => p.code === 'DUBAI_VIP40');
      expect(found).toBeDefined();
      expect(found?.discount_value).toBe(40);
    });

    it('validates promo inputs and rejects invalid promo codes or non-positive discounts', async () => {
      await expect(
        createAdminPromo({
          code: '',
          discount_type: 'percentage',
          discount_value: 10,
          is_active: true,
          max_uses: 100,
        })
      ).rejects.toThrow(/code is required/i);

      await expect(
        createAdminPromo({
          code: 'TEST0',
          discount_type: 'fixed_aed',
          discount_value: 0,
          is_active: true,
          max_uses: 100,
        })
      ).rejects.toThrow(/discount value must be greater than 0/i);
    });

    it('toggles admin promo is_active status correctly', async () => {
      const promos = await fetchAdminPromos();
      const target = promos.find((p) => p.code === 'SPECIAL20')!;
      expect(target.is_active).toBe(true);

      const toggled = await toggleAdminPromo(target.id, false);
      expect(toggled).toBe(true);

      const updatedPromos = await fetchAdminPromos();
      const after = updatedPromos.find((p) => p.id === target.id);
      expect(after?.is_active).toBe(false);
    });

    it('returns false when toggling an unknown promo ID', async () => {
      const toggled = await toggleAdminPromo('unknown_promo_id_999', false);
      expect(toggled).toBe(false);
    });
  });

  describe('extendBrokerTrial', () => {
    it('extends trial by default 3 days for active trial profile', async () => {
      const mockProfile: Profile = {
        id: 'broker-trial-1',
        full_name: 'Ahmed Al Mansoori',
        agency_name: 'Apex Dubai Realty',
        whatsapp_number: '+971501112233',
        role: 'agent',
        status: 'active',
        subscription_status: 'trial',
        trial_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day remaining
        created_at: new Date().toISOString(),
      };

      const originalExpiresAt = new Date(mockProfile.trial_expires_at!).getTime();
      const updatedProfile = await extendBrokerTrial(mockProfile.id, undefined, mockProfile);

      expect(updatedProfile.subscription_status).toBe('trial');
      const newExpiresAt = new Date(updatedProfile.trial_expires_at!).getTime();
      // Should add 3 days (3 * 86400 * 1000) to original expiration date
      expect(newExpiresAt).toBeGreaterThan(originalExpiresAt);
      const diffDays = Math.round((newExpiresAt - originalExpiresAt) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(3);
    });

    it('extends trial by specified additional days (e.g. 7 days)', async () => {
      const mockProfile: Profile = {
        id: 'broker-trial-2',
        full_name: 'Sara Khan',
        agency_name: 'Skyline Properties',
        whatsapp_number: '+971509998877',
        role: 'agent',
        status: 'active',
        subscription_status: 'trial',
        trial_expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      const originalExpiresAt = new Date(mockProfile.trial_expires_at!).getTime();
      const updatedProfile = await extendBrokerTrial(mockProfile.id, 7, mockProfile);

      const newExpiresAt = new Date(updatedProfile.trial_expires_at!).getTime();
      const diffDays = Math.round((newExpiresAt - originalExpiresAt) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(7);
    });

    it('bases extension from Date.now() when trial has already expired in the past', async () => {
      const now = Date.now();
      const expiredPastDate = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago

      const mockProfile: Profile = {
        id: 'broker-expired-1',
        full_name: 'Rashid Omar',
        agency_name: 'Marina Luxury Estates',
        whatsapp_number: '+971504445566',
        role: 'agent',
        status: 'active',
        subscription_status: 'trial',
        trial_expires_at: expiredPastDate,
        created_at: new Date().toISOString(),
      };

      const updatedProfile = await extendBrokerTrial(mockProfile.id, 5, mockProfile);
      const newExpiresAt = new Date(updatedProfile.trial_expires_at!).getTime();

      // Should be roughly now + 5 days
      const expectedTarget = now + 5 * 24 * 60 * 60 * 1000;
      expect(Math.abs(newExpiresAt - expectedTarget)).toBeLessThan(5000);
      expect(updatedProfile.subscription_status).toBe('trial');
    });
  });

  describe('sendBroadcastEmail', () => {
    it('dispatches broadcast emails to target audience and records log', async () => {
      const res = await sendBroadcastEmail({
        audience: 'trial_users',
        subject: 'VIP Launch: Dubai Islands Island B Villas',
        htmlContent: '<p>Exclusive wholesale broker allocation is now live.</p>',
      });

      expect(res.success).toBe(true);
      expect(res.dispatchedCount).toBeGreaterThan(0);
    });

    it('rejects broadcast when subject or content is missing', async () => {
      await expect(
        sendBroadcastEmail({
          audience: 'all',
          subject: '',
          htmlContent: '<p>Test</p>',
        })
      ).rejects.toThrow(/subject and htmlContent are required/i);

      await expect(
        sendBroadcastEmail({
          audience: 'all',
          subject: 'Test Subject',
          htmlContent: '',
        })
      ).rejects.toThrow(/subject and htmlContent are required/i);
    });
  });

  describe('fetchRevenueMetrics', () => {
    it('calculates contracted MRR at activeCount * 149 AED and returns financial stats', async () => {
      const metrics = await fetchRevenueMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.mrrAed).toBe('number');
      expect(typeof metrics.cashCollected30d).toBe('number');
      expect(typeof metrics.activeCount).toBe('number');
      expect(typeof metrics.trialCount).toBe('number');

      // Contracted MRR formula: activeCount * 149 AED
      expect(metrics.mrrAed).toBe(metrics.activeCount * 149);
      expect(metrics.cashCollected30d).toBeGreaterThanOrEqual(0);
      expect(metrics.activeCount).toBeGreaterThanOrEqual(0);
      expect(metrics.trialCount).toBeGreaterThanOrEqual(0);
    });
  });
});
