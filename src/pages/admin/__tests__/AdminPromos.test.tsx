import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AdminPromos from '../AdminPromos';
import * as marketingService from '../../../services/marketingService';
import type { PromoCoupon } from '../../../types';

describe('AdminPromos Component', () => {
  const mockPromos: PromoCoupon[] = [
    {
      id: 'promo_special20',
      code: 'SPECIAL20',
      discount_type: 'percentage',
      discount_value: 20,
      description: '20% Special Partner Discount',
      is_active: true,
      max_uses: 100,
      times_redeemed: 14,
      valid_until: '2026-12-31T23:59:59.000Z',
      created_at: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'promo_welcome50',
      code: 'WELCOME50',
      discount_type: 'fixed_aed',
      discount_value: 50,
      description: '50 AED Welcome Credit',
      is_active: true,
      max_uses: 200,
      times_redeemed: 42,
      valid_until: null,
      created_at: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'promo_earlybird',
      code: 'EARLYBIRD',
      discount_type: 'percentage',
      discount_value: 30,
      description: '30% Early Bird VIP Discount',
      is_active: true,
      max_uses: 50,
      times_redeemed: 8,
      valid_until: '2026-11-30T23:59:59.000Z',
      created_at: '2026-10-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    marketingService.resetMarketingStore();
    vi.restoreAllMocks();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders promotional vouchers list with initial promo codes, redemption counts, and Create button', async () => {
    render(<AdminPromos initialPromos={mockPromos} />);

    // Header and create button
    expect(screen.getByText(/Promo & Voucher Management/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Promo Code/i })).toBeInTheDocument();

    // Codes in monospace uppercase
    expect(screen.getByText('SPECIAL20')).toBeInTheDocument();
    expect(screen.getByText('WELCOME50')).toBeInTheDocument();
    expect(screen.getByText('EARLYBIRD')).toBeInTheDocument();

    // Discount values and types
    expect(screen.getByText(/20% OFF/i)).toBeInTheDocument();
    expect(screen.getByText(/50 AED OFF/i)).toBeInTheDocument();
    expect(screen.getByText(/30% OFF/i)).toBeInTheDocument();

    // Redemption metrics
    expect(screen.getByText(/14 \/ 100/i)).toBeInTheDocument();
    expect(screen.getByText(/42 \/ 200/i)).toBeInTheDocument();
    expect(screen.getByText(/8 \/ 50/i)).toBeInTheDocument();
  });

  it('fetches promo codes from marketingService when initialPromos is not provided', async () => {
    const fetchSpy = vi.spyOn(marketingService, 'fetchAdminPromos').mockResolvedValue(mockPromos);

    render(<AdminPromos />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
      expect(screen.getByText('SPECIAL20')).toBeInTheDocument();
    });
  });

  it('filters vouchers by search query across code and description', async () => {
    render(<AdminPromos initialPromos={mockPromos} />);

    const searchInput = screen.getByPlaceholderText(/search promo code or description/i);
    fireEvent.change(searchInput, { target: { value: 'welcome' } });

    expect(screen.getByText('WELCOME50')).toBeInTheDocument();
    expect(screen.queryByText('SPECIAL20')).not.toBeInTheDocument();
    expect(screen.queryByText('EARLYBIRD')).not.toBeInTheDocument();
  });

  it('copies promo code to clipboard when copy button is clicked', async () => {
    render(<AdminPromos initialPromos={mockPromos} />);

    const copyButtons = screen.getAllByRole('button', { name: /copy code/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SPECIAL20');
  });

  it('opens create modal, validates required inputs, and creates a percentage promo', async () => {
    const createSpy = vi.spyOn(marketingService, 'createAdminPromo');

    render(<AdminPromos initialPromos={mockPromos} />);

    // Open modal
    const createBtn = screen.getByRole('button', { name: /Create Promo Code/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Create Promotional Code/i)).toBeInTheDocument();

    // Auto uppercase code input
    const codeInput = screen.getByLabelText(/Coupon Code/i);
    fireEvent.change(codeInput, { target: { value: 'summer25' } });
    expect(codeInput).toHaveValue('SUMMER25');

    // Discount value
    const valueInput = screen.getByLabelText(/Discount Value/i);
    fireEvent.change(valueInput, { target: { value: '25' } });

    // Description
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'Summer Launch Special' } });

    // Max uses
    const maxUsesInput = screen.getByLabelText(/Max Redemptions Cap/i);
    fireEvent.change(maxUsesInput, { target: { value: '150' } });

    // Expiry date
    const expiryInput = screen.getByLabelText(/Expiration Date/i);
    fireEvent.change(expiryInput, { target: { value: '2026-09-30' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Generate Voucher/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SUMMER25',
          discount_type: 'percentage',
          discount_value: 25,
          description: 'Summer Launch Special',
          max_uses: 150,
          is_active: true,
        })
      );
    });

    // Check newly created code appears in list
    await waitFor(() => {
      expect(screen.getByText('SUMMER25')).toBeInTheDocument();
      expect(screen.getByText(/25% OFF/i)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('creates a fixed AED discount promo when AED discount type is selected', async () => {
    const createSpy = vi.spyOn(marketingService, 'createAdminPromo');

    render(<AdminPromos initialPromos={mockPromos} />);

    fireEvent.click(screen.getByRole('button', { name: /Create Promo Code/i }));

    // Switch to AED discount type
    const fixedAedTab = screen.getByRole('button', { name: /Fixed AED/i });
    fireEvent.click(fixedAedTab);

    // Code & Value
    fireEvent.change(screen.getByLabelText(/Coupon Code/i), { target: { value: 'VIP75AED' } });
    fireEvent.change(screen.getByLabelText(/Discount Value/i), { target: { value: '75' } });

    fireEvent.click(screen.getByRole('button', { name: /Generate Voucher/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VIP75AED',
          discount_type: 'fixed_aed',
          discount_value: 75,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('VIP75AED')).toBeInTheDocument();
      expect(screen.getByText(/75 AED OFF/i)).toBeInTheDocument();
    });
  });

  it('displays validation errors when trying to submit invalid inputs', async () => {
    render(<AdminPromos initialPromos={mockPromos} />);

    fireEvent.click(screen.getByRole('button', { name: /Create Promo Code/i }));

    // Submit empty
    fireEvent.click(screen.getByRole('button', { name: /Generate Voucher/i }));

    expect(screen.getByText(/Coupon code is required/i)).toBeInTheDocument();

    // Fill code but zero value
    fireEvent.change(screen.getByLabelText(/Coupon Code/i), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/Discount Value/i), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /Generate Voucher/i }));

    expect(screen.getByText(/Discount value must be greater than 0/i)).toBeInTheDocument();
  });

  it('toggles active/inactive status with optimistic UI update and service call', async () => {
    const toggleSpy = vi.spyOn(marketingService, 'toggleAdminPromo').mockResolvedValue(true);

    render(<AdminPromos initialPromos={mockPromos} />);

    // SPECIAL20 is active initially
    const specialRowToggle = screen.getByTestId('toggle-promo_special20');
    expect(specialRowToggle).toHaveAttribute('aria-checked', 'true');

    // Click to deactivate
    fireEvent.click(specialRowToggle);

    await waitFor(() => {
      expect(toggleSpy).toHaveBeenCalledWith('promo_special20', false);
      expect(specialRowToggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('displays expired warning badge for vouchers past their expiration date', () => {
    const expiredPromo: PromoCoupon = {
      id: 'promo_expired_1',
      code: 'EXPIRED10',
      discount_type: 'percentage',
      discount_value: 10,
      description: 'Expired promo',
      is_active: true,
      max_uses: 50,
      times_redeemed: 50,
      valid_until: '2023-01-01T00:00:00.000Z',
      created_at: '2022-12-01T00:00:00.000Z',
    };

    render(<AdminPromos initialPromos={[expiredPromo]} />);

    expect(screen.getByText('EXPIRED10')).toBeInTheDocument();
    expect(screen.getByTestId('expired-badge-promo_expired_1')).toHaveTextContent(/Expired/i);
  });

  it('closes create promo modal when clicking Cancel or X button', async () => {
    render(<AdminPromos initialPromos={mockPromos} />);

    fireEvent.click(screen.getByRole('button', { name: /Create Promo Code/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
