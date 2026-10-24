import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionPage from '../SubscriptionPage';
import * as paymentService from '../../../services/paymentService';

describe('SubscriptionPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders single 149 AED/month plan with Dubai broker value pillars and payment badges', () => {
    render(<SubscriptionPage userEmail="broker@dubairealty.ae" />);

    expect(screen.getByText(/Subscribe to Realtor Buddy/i)).toBeInTheDocument();
    expect(screen.getByText(/Dubai Realtor License Required/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Monthly Pro Broker/i })).toBeInTheDocument();
    expect(screen.getAllByText(/149/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/AED \/ month/i).length).toBeGreaterThanOrEqual(1);

    // 4 Luxury Dubai Broker Value Pillars
    expect(screen.getByText(/Unlimited Direct Client Matches/i)).toBeInTheDocument();
    expect(screen.getByText(/Off-Market Inventory Feed/i)).toBeInTheDocument();
    expect(screen.getByText(/Instant WhatsApp Listing Share/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority Push Alerts/i)).toBeInTheDocument();

    // Payment Badges & Single Direct Checkout Button
    expect(screen.getByText(/Apple Pay/i)).toBeInTheDocument();
    expect(screen.getByText(/Visa \/ Mastercard/i)).toBeInTheDocument();
    expect(screen.getByText(/Ziina AED Gateway/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Pay 149 AED$/i })).toBeInTheDocument();
  });

  it('applying coupon discount SPECIAL20 updates displayed checkout price to 119 AED', async () => {
    render(<SubscriptionPage userEmail="agent@luxuryproperties.ae" />);

    // Initial price should be 149 AED
    expect(screen.getByRole('button', { name: /^Pay 149 AED$/i })).toBeInTheDocument();

    // Apply SPECIAL20 coupon (20% off 149 = 30 AED discount -> 119 AED)
    const couponInput = screen.getByPlaceholderText(/e\.g\. SPECIAL20 or VIP100/i);
    fireEvent.change(couponInput, { target: { value: 'SPECIAL20' } });

    const applyButtons = screen.getAllByRole('button', { name: /Apply/i });
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/20% Special Partner Discount applied \(-30 AED\)/i)).toBeInTheDocument();
    });

    // Checkout price updates to 119 AED
    expect(screen.getAllByText(/119 AED/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /^Pay 119 AED$/i })).toBeInTheDocument();
  });

  it('calls payment checkout initiation when Pay button is clicked', async () => {
    const mockOnPaymentInitiated = vi.fn();
    const createSessionSpy = vi.spyOn(paymentService, 'createCheckoutSession').mockResolvedValue({
      sessionId: 'mock_sess_monthly_149',
      checkoutUrl: 'https://checkout.ziina.com/session/mock_sess_monthly_149',
      finalPriceAed: 149,
      isZeroAed: false,
      autoRenew: true,
    });

    render(
      <SubscriptionPage
        userEmail="agent@luxuryproperties.ae"
        onPaymentInitiated={mockOnPaymentInitiated}
      />
    );

    const checkoutBtn = screen.getByRole('button', { name: /^Pay 149 AED$/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(createSessionSpy).toHaveBeenCalledWith('monthly', 'agent@luxuryproperties.ae', {
        autoRenew: true,
        couponCode: undefined,
        referralCode: undefined,
      });
      expect(mockOnPaymentInitiated).toHaveBeenCalledWith(
        'mock_sess_monthly_149',
        'https://checkout.ziina.com/session/mock_sess_monthly_149'
      );
    });
  });

  it('allows applying broker referral code', async () => {
    render(<SubscriptionPage userEmail="agent@luxuryproperties.ae" />);

    // Apply KARIM-DUBAI referral (10% off 149 = 15 AED discount -> 134 AED)
    const referralInput = screen.getByPlaceholderText(/e\.g\. KARIM-DUBAI or MONIL-VIP/i);
    fireEvent.change(referralInput, { target: { value: 'KARIM-DUBAI' } });

    const applyButtons = screen.getAllByRole('button', { name: /Apply/i });
    fireEvent.click(applyButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/Karim Al-Sayed referral applied \(-15 AED\)/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^Pay 134 AED$/i })).toBeInTheDocument();
  });

  it('allows toggling auto-renew checkbox', () => {
    render(<SubscriptionPage userEmail="agent@luxuryproperties.ae" />);

    const autoRenewCheckbox = screen.getByLabelText(/Enable Auto-Renew \(Autopay\)/i);
    expect(autoRenewCheckbox).toBeChecked();

    fireEvent.click(autoRenewCheckbox);
    expect(autoRenewCheckbox).not.toBeChecked();

    fireEvent.click(autoRenewCheckbox);
    expect(autoRenewCheckbox).toBeChecked();
  });

  it('displays error message when payment initiation fails', async () => {
    vi.spyOn(paymentService, 'createCheckoutSession').mockRejectedValue(
      new Error('Gateway connection timed out in Dubai region')
    );

    render(<SubscriptionPage userEmail="agent@luxuryproperties.ae" />);

    const checkoutBtn = screen.getByRole('button', { name: /^Pay 149 AED$/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Gateway connection timed out in Dubai region/i)
      ).toBeInTheDocument();
    });
  });

  it('calls onNavigate to return to homepage when back button is clicked', () => {
    const handleNavigate = vi.fn();
    render(<SubscriptionPage onNavigate={handleNavigate} />);

    const backBtn = screen.getByRole('button', { name: /Return to Dubai Listings Map/i });
    fireEvent.click(backBtn);

    expect(handleNavigate).toHaveBeenCalledWith('/');
  });
});