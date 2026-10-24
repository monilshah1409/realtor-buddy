import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
