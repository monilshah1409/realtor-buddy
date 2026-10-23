import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubscriptionPage from '../SubscriptionPage';
import * as paymentService from '../../../services/paymentService';

describe('SubscriptionPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dubai broker headline, pricing plans, and payment badges', () => {
    render(<SubscriptionPage userEmail="broker@dubairealty.ae" />);

    expect(screen.getByText(/Subscribe to Realtor Buddy/i)).toBeTruthy();
    expect(screen.getByText(/Dubai Realtor License Required/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Monthly Pro Broker/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Annual VIP Broker/i })).toBeTruthy();
    expect(screen.getAllByText(/499/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/4,990/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Apple Pay/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Visa \/ Mastercard/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pay with Apple Pay \/ Card/i })).toBeTruthy();
  });

  it('toggles selection to annual plan and updates checkout details', () => {
    render(<SubscriptionPage userEmail="broker@dubairealty.ae" />);

    const annualRadio = screen.getByLabelText(/Annual plan/i);
    fireEvent.click(annualRadio);

    expect(annualRadio).toBeChecked();
    expect(screen.getByRole('heading', { name: /Annual VIP Broker/i })).toBeTruthy();
  });

  it('triggers onPaymentInitiated callback with session and checkoutUrl', async () => {
    const mockOnPaymentInitiated = vi.fn();
    vi.spyOn(paymentService, 'createCheckoutSession').mockResolvedValue({
      sessionId: 'mock_sess_monthly_abc',
      checkoutUrl: 'https://checkout.ziina.com/session/mock_sess_monthly_abc',
      finalPriceAed: 499,
      isZeroAed: false,
      autoRenew: true,
    });

    render(
      <SubscriptionPage
        userEmail="agent@luxuryproperties.ae"
        onPaymentInitiated={mockOnPaymentInitiated}
      />
    );

    const checkoutBtn = screen.getByRole('button', { name: /Pay with Apple Pay \/ Card/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(mockOnPaymentInitiated).toHaveBeenCalledWith(
        'mock_sess_monthly_abc',
        'https://checkout.ziina.com/session/mock_sess_monthly_abc'
      );
    });
  });

  it('allows applying coupon code and toggling auto-renew', async () => {
    render(<SubscriptionPage userEmail="agent@luxuryproperties.ae" />);

    // Toggle auto-renew
    const autoRenewCheckbox = screen.getByLabelText(/Enable Auto-Renew \(Autopay\)/i);
    expect(autoRenewCheckbox).toBeChecked();
    fireEvent.click(autoRenewCheckbox);
    expect(autoRenewCheckbox).not.toBeChecked();

    // Apply coupon
    const couponInput = screen.getByPlaceholderText(/e\.g\. SPECIAL20 or VIP100/i);
    fireEvent.change(couponInput, { target: { value: 'SPECIAL20' } });

    const applyButtons = screen.getAllByRole('button', { name: /Apply/i });
    fireEvent.click(applyButtons[0]);

    expect(screen.getByText(/20% Special Partner Discount applied/i)).toBeInTheDocument();
  });

  it('displays error message when payment initiation fails', async () => {
    vi.spyOn(paymentService, 'createCheckoutSession').mockRejectedValue(
      new Error('Gateway connection timed out in Dubai region')
    );

    render(<SubscriptionPage userEmail="agent@luxuryproperties.ae" />);

    const checkoutBtn = screen.getByRole('button', { name: /Pay with Apple Pay \/ Card/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Gateway connection timed out in Dubai region/i)
      ).toBeTruthy();
    });
  });
});
