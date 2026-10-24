import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthPage from '../AuthPage';
import { PRESET_PROFILES } from '../../../services/authService';

describe('AuthPage Component', () => {
  it('renders Broker Portal Sign In title and email/password inputs by default', () => {
    render(<AuthPage onSuccess={vi.fn()} onNavigateHome={vi.fn()} />);

    expect(screen.getByText('Broker Portal Sign In')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('broker@dubaiagency.ae')).toBeInTheDocument();
    expect(screen.getByText('Enter Broker Portal')).toBeInTheDocument();
  });

  it('switches between Sign In, Register, and Demo Switch tabs', () => {
    render(<AuthPage onSuccess={vi.fn()} onNavigateHome={vi.fn()} />);

    // Click Register Tab
    fireEvent.click(screen.getByText('Register'));
    expect(screen.getByText('Register Broker Credentials')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Rashid Al-Falasi')).toBeInTheDocument();
    expect(screen.getByText(/Wholesale Protection/i)).toBeInTheDocument();

    // Click Demo Switch Tab
    fireEvent.click(screen.getByText('Demo Switch'));
    expect(screen.getByText('Select Broker Persona')).toBeInTheDocument();
    expect(screen.getByText('Karim Al-Sayed')).toBeInTheDocument();
    expect(screen.getByText('Monil & Edwin')).toBeInTheDocument();
    expect(screen.getByText('Rashid Al-Falasi')).toBeInTheDocument();
  });

  it('authenticates with a demo broker persona when clicked', async () => {
    const handleSuccess = vi.fn();
    render(<AuthPage onSuccess={handleSuccess} onNavigateHome={vi.fn()} initialMode="quick_switch" />);

    // Click Monil & Edwin (Admin)
    const adminPersona = screen.getByText('Monil & Edwin');
    fireEvent.click(adminPersona);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(PRESET_PROFILES.admin);
    });
  });

  it('submits broker sign in form and calls onSuccess', async () => {
    const handleSuccess = vi.fn();
    render(<AuthPage onSuccess={handleSuccess} onNavigateHome={vi.fn()} />);

    const emailInput = screen.getByPlaceholderText('broker@dubaiagency.ae');
    fireEvent.change(emailInput, { target: { value: 'karim@premierdubai.ae' } });

    const submitBtn = screen.getByText('Enter Broker Portal');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  it('calls onNavigateHome when return link is clicked', () => {
    const handleHome = vi.fn();
    render(<AuthPage onSuccess={vi.fn()} onNavigateHome={handleHome} />);

    const returnBtn = screen.getByText(/Return to Dubai Listings Map/i);
    fireEvent.click(returnBtn);

    expect(handleHome).toHaveBeenCalled();
  });

  it('gates registration behind OTP modal and completes account creation upon verification', async () => {
    const handleSuccess = vi.fn();
    render(<AuthPage onSuccess={handleSuccess} onNavigateHome={vi.fn()} initialMode="register" />);

    // Fill registration form
    fireEvent.change(screen.getByPlaceholderText('e.g. Rashid Al-Falasi'), {
      target: { value: 'Nasser Al-Nuaimi' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Emaar Signature Partner'), {
      target: { value: 'Downtown Luxury' },
    });
    fireEvent.change(screen.getByPlaceholderText('agent@agency.ae'), {
      target: { value: 'nasser@downtown.ae' },
    });

    // Submit registration form
    const submitBtn = screen.getByText('Submit Broker Application');
    fireEvent.click(submitBtn);

    // Verify OTP modal opens
    await waitFor(() => {
      expect(screen.getByText('Verification Code')).toBeInTheDocument();
      expect(screen.getByText('nasser@downtown.ae')).toBeInTheDocument();
    });

    const modal = screen.getByRole('dialog');
    const otpInputs = within(modal).getAllByRole('textbox');
    expect(otpInputs.length).toBe(6);

    // Enter 6-digit OTP
    ['1', '2', '3', '4', '5', '6'].forEach((digit, i) => {
      fireEvent.change(otpInputs[i], { target: { value: digit } });
    });

    // Click verify
    const verifyBtn = within(modal).getByRole('button', { name: /verify & complete registration/i });
    fireEvent.click(verifyBtn);

    // Expect account completion and onSuccess called
    await waitFor(
      () => {
        expect(handleSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: 'Nasser Al-Nuaimi',
            agency_name: 'Downtown Luxury',
            email: 'nasser@downtown.ae',
            email_verified: true,
          })
        );
      },
      { timeout: 2000 }
    );
  });

  it('allows changing email in the OTP modal during registration and updates profile email', async () => {
    const handleSuccess = vi.fn();
    render(<AuthPage onSuccess={handleSuccess} onNavigateHome={vi.fn()} initialMode="register" />);

    // Fill initial registration fields
    fireEvent.change(screen.getByPlaceholderText('e.g. Rashid Al-Falasi'), {
      target: { value: 'Laila Rostova' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Emaar Signature Partner'), {
      target: { value: 'Apex Elite' },
    });
    fireEvent.change(screen.getByPlaceholderText('agent@agency.ae'), {
      target: { value: 'wrong.laila@apex.ae' },
    });

    fireEvent.click(screen.getByText('Submit Broker Application'));

    await waitFor(() => {
      expect(screen.getByText('Verification Code')).toBeInTheDocument();
      expect(screen.getByText('wrong.laila@apex.ae')).toBeInTheDocument();
    });

    const modal = screen.getByRole('dialog');

    // Change email in modal
    fireEvent.click(within(modal).getByRole('button', { name: /change email/i }));
    const newEmailInput = within(modal).getByPlaceholderText(/enter new email/i);
    fireEvent.change(newEmailInput, { target: { value: 'laila.correct@apex.ae' } });
    fireEvent.click(within(modal).getByRole('button', { name: /update & send otp/i }));

    await waitFor(() => {
      expect(within(modal).getByText('laila.correct@apex.ae')).toBeInTheDocument();
    });

    // Enter OTP in the 6 digit inputs (excluding the email input)
    const otpInputs = within(modal).getAllByRole('textbox');
    ['6', '5', '4', '3', '2', '1'].forEach((digit, i) => {
      fireEvent.change(otpInputs[i], { target: { value: digit } });
    });

    fireEvent.click(within(modal).getByRole('button', { name: /verify & complete registration/i }));

    await waitFor(
      () => {
        expect(handleSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: 'Laila Rostova',
            agency_name: 'Apex Elite',
            email: 'laila.correct@apex.ae',
            email_verified: true,
          })
        );
      },
      { timeout: 2000 }
    );
  });
});
