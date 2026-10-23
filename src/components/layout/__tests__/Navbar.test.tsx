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

  it('renders Agent role badge and subscription active status', () => {
    render(
      <Navbar
        currentPath="/"
        onNavigate={vi.fn()}
        userProfile={AGENT_PROFILE}
        onProfileChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Subscription Active/i)).toBeInTheDocument();
    expect(screen.getByTestId('profile-role-badge')).toHaveTextContent(/Agent/i);
    expect(screen.getByText('Karim Al-Sayed')).toBeInTheDocument();
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
