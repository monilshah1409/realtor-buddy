import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProfilePage from '../ProfilePage';
import { AGENT_PROFILE, ADMIN_PROFILE } from '../../../components/layout/Navbar';

describe('ProfilePage Component', () => {
  it('renders broker details, agency name, and WhatsApp info', () => {
    render(
      <ProfilePage
        userProfile={AGENT_PROFILE}
        onProfileUpdate={vi.fn()}
        onSignOut={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Karim Al-Sayed' })).toBeInTheDocument();
    expect(screen.getByText('Premier Dubai Properties')).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp: \+971501234567/i)).toBeInTheDocument();
    expect(screen.getByText('Verified Dubai Broker')).toBeInTheDocument();
  });

  it('renders Admin clearance badge when user is admin', () => {
    render(
      <ProfilePage
        userProfile={ADMIN_PROFILE}
        onProfileUpdate={vi.fn()}
        onSignOut={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText('Admin / Platform Gatekeeper')).toBeInTheDocument();
  });

  it('allows updating profile fields and saves changes', async () => {
    const handleUpdate = vi.fn();
    render(
      <ProfilePage
        userProfile={AGENT_PROFILE}
        onProfileUpdate={handleUpdate}
        onSignOut={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    const nameInput = screen.getByDisplayValue('Karim Al-Sayed');
    fireEvent.change(nameInput, { target: { value: 'Karim Updated' } });

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Karim Updated',
        })
      );
    });
  });

  it('navigates to /subscribe when Manage Subscription is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <ProfilePage
        userProfile={AGENT_PROFILE}
        onProfileUpdate={vi.fn()}
        onSignOut={vi.fn()}
        onNavigate={handleNavigate}
      />
    );

    const subBtn = screen.getByText('Manage Subscription');
    fireEvent.click(subBtn);

    expect(handleNavigate).toHaveBeenCalledWith('/subscribe');
  });

  it('calls onSignOut when Sign Out is clicked', async () => {
    const handleSignOut = vi.fn();
    render(
      <ProfilePage
        userProfile={AGENT_PROFILE}
        onProfileUpdate={vi.fn()}
        onSignOut={handleSignOut}
        onNavigate={vi.fn()}
      />
    );

    const signOutBtn = screen.getByText('Sign Out');
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(handleSignOut).toHaveBeenCalled();
    });
  });
});
