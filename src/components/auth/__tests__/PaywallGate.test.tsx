import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PaywallGate from '../PaywallGate';
import * as paymentService from '../../../services/paymentService';

describe('PaywallGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks access and displays subscription checkout when subscription is inactive', () => {
    const profile = { role: 'agent' as const, status: 'active' as const, subscription_status: 'inactive' as const };
    render(
      <PaywallGate profile={profile}>
        <div>Protected Property Search</div>
      </PaywallGate>
    );
    expect(screen.queryByText('Protected Property Search')).toBeNull();
    expect(screen.getByText(/Subscribe to Realtor Buddy/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pay with Apple Pay \/ Card/i })).toBeTruthy();
  });

  it('allows access when agent has active subscription and approved status', () => {
    const profile = { role: 'agent' as const, status: 'active' as const, subscription_status: 'active' as const };
    render(
      <PaywallGate profile={profile}>
        <div>Protected Property Search</div>
      </PaywallGate>
    );
    expect(screen.getByText('Protected Property Search')).toBeTruthy();
  });

  it('always allows access if profile role is admin, even if subscription is inactive', () => {
    const adminProfile = { role: 'admin' as const, status: 'active' as const, subscription_status: 'inactive' as const };
    render(
      <PaywallGate profile={adminProfile}>
        <div>Admin Dashboard Content</div>
      </PaywallGate>
    );
    expect(screen.getByText('Admin Dashboard Content')).toBeTruthy();
    expect(screen.queryByText(/Subscribe to Realtor Buddy/i)).toBeNull();
  });

  it('renders pending approval notice when subscription is active but broker status is pending_approval', () => {
    const pendingProfile = {
      role: 'agent' as const,
      status: 'pending_approval' as const,
      subscription_status: 'active' as const,
    };
    render(
      <PaywallGate profile={pendingProfile}>
        <div>Protected Property Search</div>
      </PaywallGate>
    );

    expect(screen.queryByText('Protected Property Search')).toBeNull();
    expect(screen.getByText(/Your subscription is active!/i)).toBeTruthy();
    expect(screen.getByText(/Monil & Edwin are verifying your broker credentials/i)).toBeTruthy();
    expect(screen.getByText(/You will have full access within 2 hours/i)).toBeTruthy();
  });

  it('blocks access when profile is null or undefined', () => {
    render(
      <PaywallGate profile={null}>
        <div>Protected Property Search</div>
      </PaywallGate>
    );
    expect(screen.queryByText('Protected Property Search')).toBeNull();
    expect(screen.getByText(/Subscribe to Realtor Buddy/i)).toBeTruthy();
  });

  it('allows toggling between monthly and annual plans and triggers checkout session', async () => {
    const spyCreate = vi.spyOn(paymentService, 'createCheckoutSession').mockResolvedValue({
      sessionId: 'mock_sess_annual_123',
      checkoutUrl: 'https://checkout.ziina.com/session/mock_annual_123',
      finalPriceAed: 4990,
      isZeroAed: false,
      autoRenew: true,
    });

    const profile = {
      role: 'agent' as const,
      status: 'active' as const,
      subscription_status: 'inactive' as const,
    };

    render(
      <PaywallGate profile={profile} user={{ email: 'broker@dubai.ae' }}>
        <div>Protected Content</div>
      </PaywallGate>
    );

    // Switch to Annual plan
    const annualOption = screen.getByLabelText(/Annual plan/i);
    fireEvent.click(annualOption);

    const payBtn = screen.getByRole('button', { name: /Pay with Apple Pay \/ Card/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(spyCreate).toHaveBeenCalledWith('annual', 'broker@dubai.ae', expect.anything());
    });
  });
});
