import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AdminMarketing from '../AdminMarketing';
import * as marketingService from '../../../services/marketingService';

describe('AdminMarketing 8-Template Previewer & Live Test Dispatcher', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('displays active SMTP engine status badge and all 8 templates in library', () => {
    render(<AdminMarketing initialCampaigns={[]} />);

    // SMTP Engine Status Badge
    expect(
      screen.getByText(/SMTP Engine: Nodemailer Direct Transport \(Stylofista Architecture - Limit Bypassed\)/i)
    ).toBeInTheDocument();

    // Section title
    expect(screen.getByText(/Email Template Library & Previewer/i)).toBeInTheDocument();

    // All 8 templates
    expect(screen.getByText(/OTP Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Broker Welcome & VIP Trial/i)).toBeInTheDocument();
    expect(screen.getByText(/Trial Day 3 Feature Discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Trial 24h Expiration Alert/i)).toBeInTheDocument();
    expect(screen.getByText(/Trial Expired Win-Back Offer/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment Receipt/i)).toBeInTheDocument();
    expect(screen.getByText(/Property Listing Review Update/i)).toBeInTheDocument();
    expect(screen.getByText(/Executive Broadcast Announcement/i)).toBeInTheDocument();
  });

  it('opens luxury preview modal when a template is selected and displays rendered preview', async () => {
    render(<AdminMarketing initialCampaigns={[]} />);

    // Find Preview button for OTP Verification
    const otpPreviewBtn = screen.getByRole('button', { name: /preview otp verification/i });
    fireEvent.click(otpPreviewBtn);

    // Modal opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Template Preview: OTP Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Broker Verification Code/i)).toBeInTheDocument();
    expect(screen.getByText(/849201/i)).toBeInTheDocument();
  });

  it('toggles between Desktop and Mobile viewport modes in preview modal', async () => {
    render(<AdminMarketing initialCampaigns={[]} />);

    const otpPreviewBtn = screen.getByRole('button', { name: /preview otp verification/i });
    fireEvent.click(otpPreviewBtn);

    const mobileBtn = screen.getByRole('button', { name: /mobile/i });
    const desktopBtn = screen.getByRole('button', { name: /desktop/i });

    expect(mobileBtn).toBeInTheDocument();
    expect(desktopBtn).toBeInTheDocument();

    // Switch to Mobile
    fireEvent.click(mobileBtn);
    const viewportContainer = screen.getByTestId('email-preview-viewport');
    expect(viewportContainer.className).toContain('max-w-[375px]');

    // Switch to Desktop
    fireEvent.click(desktopBtn);
    expect(viewportContainer.className).toContain('max-w-[650px]');
  });

  it('dispatches a test email when Send Test Email is clicked', async () => {
    const sendSpy = vi.spyOn(marketingService, 'sendEmailViaTemplate').mockResolvedValueOnce({
      success: true,
      dispatchedCount: 1,
    });

    render(<AdminMarketing initialCampaigns={[]} />);

    // Open Payment Receipt template preview
    const receiptPreviewBtn = screen.getByRole('button', { name: /preview payment receipt/i });
    fireEvent.click(receiptPreviewBtn);

    // Enter test recipient email
    const emailInput = screen.getByPlaceholderText(/admin@realtorbuddy.ae/i);
    fireEvent.change(emailInput, { target: { value: 'monil.admin@apexrealty.ae' } });

    // Click Send Test Email
    const sendTestBtn = screen.getByRole('button', { name: /send test email/i });
    fireEvent.click(sendTestBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['monil.admin@apexrealty.ae'],
          template: 'payment_receipt',
        })
      );
    });

    // Feedback message appears
    await waitFor(() => {
      expect(
        screen.getByText(/Test email successfully dispatched to monil\.admin@apexrealty\.ae/i)
      ).toBeInTheDocument();
    });
  });

  it('allows closing the template preview modal', async () => {
    render(<AdminMarketing initialCampaigns={[]} />);

    const receiptPreviewBtn = screen.getByRole('button', { name: /preview payment receipt/i });
    fireEvent.click(receiptPreviewBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close preview/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
