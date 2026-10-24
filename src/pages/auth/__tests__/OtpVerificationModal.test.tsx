import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OtpVerificationModal } from '../../../components/auth/OtpVerificationModal';

describe('OtpVerificationModal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <OtpVerificationModal
        isOpen={false}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText(/Verification Code/i)).not.toBeInTheDocument();
  });

  it('renders modal with email address and 6 input slots', () => {
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText(/broker@skyline.ae/i)).toBeInTheDocument();
    expect(screen.getByText(/Verification Code/i)).toBeInTheDocument();
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBe(6);
  });

  it('disables resend button initially during 60-second cooldown', () => {
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onChangeEmail={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const resendBtn = screen.getByRole('button', { name: /resend/i });
    expect(resendBtn).toBeDisabled();
    expect(resendBtn.textContent).toMatch(/0:|59|60/);
  });

  it('allows switching into email editing mode when Change Email is clicked', async () => {
    const handleChangeEmail = vi.fn().mockResolvedValue({ success: true });
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onChangeEmail={handleChangeEmail}
        onClose={vi.fn()}
      />
    );
    const changeEmailBtn = screen.getByRole('button', { name: /change email/i });
    fireEvent.click(changeEmailBtn);

    const newEmailInput = screen.getByPlaceholderText(/enter new email/i);
    expect(newEmailInput).toBeInTheDocument();

    fireEvent.change(newEmailInput, { target: { value: 'corrected@skyline.ae' } });
    const updateBtn = screen.getByRole('button', { name: /update & send otp/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(handleChangeEmail).toHaveBeenCalledWith('corrected@skyline.ae');
    });
  });

  it('submits 6-digit code on verify button click', async () => {
    const handleVerify = vi.fn().mockResolvedValue({ success: true, verified: true });
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={handleVerify}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    ['1', '2', '3', '4', '5', '6'].forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(handleVerify).toHaveBeenCalledWith('123456');
    });
  });

  it('displays error message on verification failure', async () => {
    const handleVerify = vi.fn().mockResolvedValue({
      success: false,
      error: 'Invalid verification code',
    });
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={handleVerify}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    ['1', '2', '3', '4', '5', '6'].forEach((digit, i) => {
      fireEvent.change(inputs[i], { target: { value: digit } });
    });

    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    fireEvent.click(verifyBtn);

    expect(await screen.findByText('Invalid verification code')).toBeInTheDocument();
  });

  it('supports pasting full 6-digit code across all input boxes', () => {
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '852963',
      },
    });

    expect(inputs[0]).toHaveValue('8');
    expect(inputs[1]).toHaveValue('5');
    expect(inputs[2]).toHaveValue('2');
    expect(inputs[3]).toHaveValue('9');
    expect(inputs[4]).toHaveValue('6');
    expect(inputs[5]).toHaveValue('3');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <OtpVerificationModal
        isOpen={true}
        email="broker@skyline.ae"
        onVerify={vi.fn()}
        onResend={vi.fn()}
        onClose={handleClose}
      />
    );
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  describe('Cooldown Timer & Resend', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('decrements countdown and enables resend button after 60 seconds', async () => {
      const handleResend = vi.fn().mockResolvedValue({ success: true });
      render(
        <OtpVerificationModal
          isOpen={true}
          email="broker@skyline.ae"
          onVerify={vi.fn()}
          onResend={handleResend}
          onClose={vi.fn()}
        />
      );

      const resendBtn = screen.getByRole('button', { name: /resend/i });
      expect(resendBtn).toBeDisabled();

      // Fast forward 60 seconds
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      expect(resendBtn).not.toBeDisabled();
      expect(resendBtn.textContent).toMatch(/resend otp/i);

      // Click resend
      await act(async () => {
        fireEvent.click(resendBtn);
      });

      expect(handleResend).toHaveBeenCalledTimes(1);
      // Resend resets cooldown back to disabled
      expect(resendBtn).toBeDisabled();
    });
  });
});
