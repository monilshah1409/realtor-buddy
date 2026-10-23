import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { ADMIN_PROFILE, AGENT_PROFILE } from '../components/layout/Navbar';
import { mockProperties } from '../data/mockProperties';

describe('Realtor Buddy Main App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });
  it('renders application brand, search controls, map, and property list', () => {
    render(<App />);
    expect(screen.getByText(/Realtor Buddy/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Search Dubai community/i)).toBeTruthy();
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('property-list')).toBeInTheDocument();
    expect(screen.getByTestId('dubai-map-wrapper')).toBeInTheDocument();
  });

  it('renders navigation links and user profile with subscription active badge', () => {
    render(<App />);
    expect(screen.getByText('Browse & Map')).toBeInTheDocument();
    expect(screen.getByText('Add Property')).toBeInTheDocument();
    expect(screen.getByText('My Shortlists')).toBeInTheDocument();
    expect(screen.getByText(/Subscription Active/i)).toBeInTheDocument();
    expect(screen.getByText('Karim Al-Sayed')).toBeInTheDocument();
  });

  it('switches between Agent View and Admin View (Monil & Edwin)', async () => {
    render(<App />);

    // Initial state is agent
    expect(screen.getByTestId('profile-role-badge')).toHaveTextContent(/Agent/i);
    expect(screen.queryByText('Approvals')).not.toBeInTheDocument();

    // Click role switcher dropdown
    const roleBtn = screen.getByTestId('role-switcher-button');
    fireEvent.click(roleBtn);

    // Click Admin View
    const adminOption = screen.getByText('Admin View (Monil & Edwin)');
    fireEvent.click(adminOption);

    // Profile role badge updates to Admin
    expect(screen.getByTestId('profile-role-badge')).toHaveTextContent(/Admin/i);
    expect(screen.getByText('Monil & Edwin')).toBeInTheDocument();

    // Approvals navigation link is now visible with pending count
    expect(screen.getByText('Approvals')).toBeInTheDocument();
  });

  it('navigates to /properties/new and displays the property creation form', () => {
    render(<App />);

    const addPropertyLink = screen.getByText('Add Property');
    fireEvent.click(addPropertyLink);

    expect(screen.getByText('List New Dubai Property')).toBeInTheDocument();
    expect(screen.getByText(/OneDrive Streaming/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Title \*/i)).toBeInTheDocument();
  });

  it('navigates to /admin/approvals and displays the Monil & Edwin split-screen queue', () => {
    render(<App initialPath="/admin/approvals" initialProfile={ADMIN_PROFILE} />);

    expect(screen.getByText(/Admin Verification & Approval Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Monil & Edwin Platform Gatekeeper/i)).toBeInTheDocument();
  });

  it('renders unauthenticated Public Property View on /share/:shareToken with confidential pricing protected', () => {
    const testProp = mockProperties[0];
    render(<App initialPath={`/share/${testProp.share_token}`} />);

    // Public view is unauthenticated without nav bar
    expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument();
    expect(screen.getByText(testProp.title)).toBeInTheDocument();
    expect(screen.getByText(/Price on Application/i)).toBeInTheDocument();

    // Developer wholesale price must be hidden
    expect(screen.queryByText('Agent Wholesale Price')).not.toBeInTheDocument();

    // WhatsApp CTA should be present
    expect(screen.getByRole('link', { name: /Inquire via WhatsApp/i })).toBeInTheDocument();
  });

  it('renders unauthenticated Public Shortlist View on /shortlist/:shareToken', () => {
    render(<App initialPath="/shortlist/demo-token" />);

    expect(screen.getByText(/Curated Property Shortlist for Valued Client/i)).toBeInTheDocument();
    expect(screen.getByText(/Property Comparison/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inquire via WhatsApp/i })).toBeInTheDocument();
  });

  it('manages property shortlisting and opens shortlist tray', () => {
    render(<App />);

    // Shortlist initial count is 1 (mock default prop-1)
    expect(screen.getByTestId('shortlist-nav-count')).toHaveTextContent('1');

    // Open shortlist drawer via My Shortlists button
    const myShortlistsBtn = screen.getByRole('button', { name: /My Shortlists/i });
    fireEvent.click(myShortlistsBtn);

    expect(screen.getByTestId('shortlist-drawer')).toBeInTheDocument();
    expect(screen.getByText(/Client Shortlist Tray/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy Client Shortlist Link/i)).toBeInTheDocument();
    expect(screen.getByText(/View Public Shortlist Page/i)).toBeInTheDocument();

    // Close shortlist drawer
    const closeBtn = screen.getByRole('button', { name: /Close Shortlist/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('shortlist-drawer')).not.toBeInTheDocument();
  });

  it('filters properties using search query input', () => {
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Search Dubai community/i);
    fireEvent.change(searchInput, { target: { value: 'Burj Crown' } });

    // Header updates to show 1 matching property
    expect(screen.getByTestId('property-count-header')).toHaveTextContent(/Showing 1 matching property/i);
    expect(screen.getAllByText('Burj Crown Luxury Residence').length).toBeGreaterThanOrEqual(1);
  });

  it('redirects to subscription paywall when agent profile subscription is inactive', () => {
    const inactiveProfile = {
      ...AGENT_PROFILE,
      subscription_status: 'inactive' as const,
    };

    render(<App initialProfile={inactiveProfile} />);

    // PaywallGate renders subscription page
    expect(screen.getByText(/Subscribe to Realtor Buddy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Monthly Pro Broker/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('dubai-map-wrapper')).not.toBeInTheDocument();
  });
});
