import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Navbar, { AGENT_PROFILE, ADMIN_PROFILE } from '../Navbar';

describe('Navbar Component', () => {
  it('renders Realtor Buddy brand logo with Dubai badge', () => {
    const handleNavigate = vi.fn();
    const handleProfileChange = vi.fn();

    render(
      <Navbar
        currentPath="/"
        onNavigate={handleNavigate}
        userProfile={AGENT_PROFILE}
        onProfileChange={handleProfileChange}
      />
    );

    expect(screen.getByText('Realtor Buddy')).toBeInTheDocument();
    expect(screen.getByText('Dubai')).toBeInTheDocument();
    expect(screen.getByText('Verified Broker Network')).toBeInTheDocument();
  });

  it('renders Agent role badge and VIP Pro Member status', () => {
    render(
      <Navbar
        currentPath="/"
        onNavigate={vi.fn()}
        userProfile={AGENT_PROFILE}
        onProfileChange={vi.fn()}
      />
    );

    expect(screen.getByText(/VIP Pro Member/i)).toBeInTheDocument();
    expect(screen.getByTestId('profile-role-badge')).toHaveTextContent(/Agent/i);
    expect(screen.getByText('Karim Al-Sayed')).toBeInTheDocument();
  });

  it('renders active trial gold pill with remaining days linking to /subscription', () => {
    const handleNavigate = vi.fn();
    const trialProfile = {
      ...AGENT_PROFILE,
      subscription_status: 'trial' as const,
      trial_expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    };

    render(
      <Navbar
        currentPath="/"
        onNavigate={handleNavigate}
        userProfile={trialProfile}
        onProfileChange={vi.fn()}
      />
    );

    const trialPill = screen.getByRole('button', { name: /5-Day Free Trial/i });
    expect(trialPill).toBeInTheDocument();
    expect(trialPill).toHaveTextContent(/4 days left/i);

    fireEvent.click(trialPill);
    expect(handleNavigate).toHaveBeenCalledWith('/subscription');
  });

  it('renders expired trial amber badge linking to /subscription', () => {
    const handleNavigate = vi.fn();
    const expiredProfile = {
      ...AGENT_PROFILE,
      subscription_status: 'trial' as const,
      trial_expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    };

    render(
      <Navbar
        currentPath="/"
        onNavigate={handleNavigate}
        userProfile={expiredProfile}
        onProfileChange={vi.fn()}
      />
    );

    const expiredBadge = screen.getByRole('button', { name: /Trial Expired • Upgrade to Pro/i });
    expect(expiredBadge).toBeInTheDocument();

    fireEvent.click(expiredBadge);
    expect(handleNavigate).toHaveBeenCalledWith('/subscription');
  });

  it('renders Admin Approvals link with pending count when profile is admin', () => {
    render(
      <Navbar
        currentPath="/"
        onNavigate={vi.fn()}
        userProfile={ADMIN_PROFILE}
        onProfileChange={vi.fn()}
        pendingApprovalsCount={3}
      />
    );

    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByTestId('profile-role-badge')).toHaveTextContent(/Admin/i);
  });

  it('switches between agent and admin via role dropdown', () => {
    const handleProfileChange = vi.fn();

    render(
      <Navbar
        currentPath="/"
        onNavigate={vi.fn()}
        userProfile={AGENT_PROFILE}
        onProfileChange={handleProfileChange}
      />
    );

    const roleBtn = screen.getByTestId('role-switcher-button');
    fireEvent.click(roleBtn);

    const adminOption = screen.getByText('Admin View (Monil & Edwin)');
    fireEvent.click(adminOption);

    expect(handleProfileChange).toHaveBeenCalledWith(ADMIN_PROFILE);
  });

  it('calls onOpenShortlist when My Shortlists is clicked', () => {
    const handleOpenShortlist = vi.fn();

    render(
      <Navbar
        currentPath="/"
        onNavigate={vi.fn()}
        userProfile={AGENT_PROFILE}
        onProfileChange={vi.fn()}
        shortlistCount={2}
        onOpenShortlist={handleOpenShortlist}
      />
    );

    const shortlistBtn = screen.getByRole('button', { name: /My Shortlists/i });
    fireEvent.click(shortlistBtn);

    expect(handleOpenShortlist).toHaveBeenCalled();
    expect(screen.getByTestId('shortlist-nav-count')).toHaveTextContent('2');
  });
});
