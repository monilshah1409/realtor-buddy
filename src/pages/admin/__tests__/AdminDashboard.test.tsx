import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import AdminDashboard, { AdminTab } from '../AdminDashboard';
import { mockProperties } from '../../../data/mockProperties';
import type { Property } from '../../../types';
import * as marketingService from '../../../services/marketingService';

describe('AdminDashboard Component', () => {
  const pendingProps: Property[] = [
    {
      ...mockProperties[0],
      id: 'pending-1',
      title: 'Sobha Hartland Waterfront Penthouse',
      status: 'private',
    },
    {
      ...mockProperties[1],
      id: 'pending-2',
      title: 'Damac Lagoons Luxury Townhouse',
      status: 'private',
    },
  ];

  beforeEach(() => {
    marketingService.resetMarketingStore();
    vi.restoreAllMocks();
    // Reset window search / history
    window.history.replaceState({}, '', '/admin');
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders top executive bar with branding and 4 accessible navigation tabs', () => {
    render(<AdminDashboard pendingProperties={pendingProps} />);

    // Header title and luxury branding
    expect(screen.getByText(/Executive Admin Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Unified Real Estate Moderation/i)).toBeInTheDocument();

    // Tab list with role="tablist"
    const tabList = screen.getByRole('tablist', { name: /admin navigation/i });
    expect(tabList).toBeInTheDocument();

    // 4 Accessible Tabs
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);

    const approvalsTab = screen.getByRole('tab', { name: /property approvals/i });
    const subscriptionsTab = screen.getByRole('tab', { name: /subscriptions & revenue/i });
    const promosTab = screen.getByRole('tab', { name: /promos & vouchers/i });
    const marketingTab = screen.getByRole('tab', { name: /marketing & email/i });

    expect(approvalsTab).toBeInTheDocument();
    expect(subscriptionsTab).toBeInTheDocument();
    expect(promosTab).toBeInTheDocument();
    expect(marketingTab).toBeInTheDocument();

    // Pending count badge on approvals tab
    expect(approvalsTab).toHaveTextContent('2');
  });

  it('renders Property Approvals as default tab with role="tabpanel"', () => {
    render(<AdminDashboard pendingProperties={pendingProps} />);

    const approvalsTab = screen.getByRole('tab', { name: /property approvals/i });
    expect(approvalsTab).toHaveAttribute('aria-selected', 'true');

    const tabPanel = screen.getByRole('tabpanel');
    expect(tabPanel).toBeInTheDocument();

    // Property Approvals content visible
    expect(screen.getByText(/Admin Verification & Approval Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Sobha Hartland Waterfront Penthouse/i)).toBeInTheDocument();
  });

  it('switches to Subscriptions & Revenue tab and renders AdminSubscriptions', async () => {
    const handleTabChange = vi.fn();
    render(<AdminDashboard onTabChange={handleTabChange} />);

    const subscriptionsTab = screen.getByRole('tab', { name: /subscriptions & revenue/i });
    fireEvent.click(subscriptionsTab);

    expect(subscriptionsTab).toHaveAttribute('aria-selected', 'true');
    expect(handleTabChange).toHaveBeenCalledWith('subscriptions');

    // AdminSubscriptions content rendered
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Subscriptions & Revenue/i })).toBeInTheDocument();
      expect(screen.getByText(/Contracted MRR/i)).toBeInTheDocument();
    });
  });

  it('switches to Promos & Vouchers tab and renders AdminPromos', async () => {
    const handleTabChange = vi.fn();
    render(<AdminDashboard onTabChange={handleTabChange} />);

    const promosTab = screen.getByRole('tab', { name: /promos & vouchers/i });
    fireEvent.click(promosTab);

    expect(promosTab).toHaveAttribute('aria-selected', 'true');
    expect(handleTabChange).toHaveBeenCalledWith('promos');

    // AdminPromos content rendered
    await waitFor(() => {
      expect(screen.getByText(/Promo & Voucher Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Vouchers/i)).toBeInTheDocument();
    });
  });

  it('switches to Marketing & Email tab and renders AdminMarketing', async () => {
    const handleTabChange = vi.fn();
    render(<AdminDashboard onTabChange={handleTabChange} />);

    const marketingTab = screen.getByRole('tab', { name: /marketing & email/i });
    fireEvent.click(marketingTab);

    expect(marketingTab).toHaveAttribute('aria-selected', 'true');
    expect(handleTabChange).toHaveBeenCalledWith('marketing');

    // AdminMarketing content rendered
    await waitFor(() => {
      expect(screen.getByText(/Marketing & Broadcast Concierge/i)).toBeInTheDocument();
      expect(screen.getByText(/Automated Lifecycle Drips/i)).toBeInTheDocument();
    });
  });

  it('respects initialTab prop directly', () => {
    render(<AdminDashboard initialTab="promos" />);

    const promosTab = screen.getByRole('tab', { name: /promos & vouchers/i });
    expect(promosTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Promo & Voucher Management/i)).toBeInTheDocument();
  });

  it('synchronizes with URL search parameter ?tab=subscriptions on initial load', () => {
    window.history.replaceState({}, '', '/admin?tab=subscriptions');

    render(<AdminDashboard />);

    const subscriptionsTab = screen.getByRole('tab', { name: /subscriptions & revenue/i });
    expect(subscriptionsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: /Subscriptions & Revenue/i })).toBeInTheDocument();
  });

  it('updates URL search params when switching tabs via history.pushState/replaceState', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    render(<AdminDashboard />);

    const marketingTab = screen.getByRole('tab', { name: /marketing & email/i });
    fireEvent.click(marketingTab);

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.anything(),
      '',
      expect.stringContaining('tab=marketing')
    );
  });

  it('forwards approve and reject actions to AdminApprovals', async () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();

    render(
      <AdminDashboard
        initialTab="approvals"
        pendingProperties={pendingProps}
        onApproveProperty={handleApprove}
        onRejectProperty={handleReject}
      />
    );

    const approveButtons = screen.getAllByRole('button', { name: /Approve as Global/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(handleApprove).toHaveBeenCalledWith('pending-1');
    });
  });
});
