import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSubscriptions from '../AdminSubscriptions';
import * as marketingService from '../../../services/marketingService';
import type { Profile, PaymentTransaction } from '../../../types';

describe('AdminSubscriptions Dashboard', () => {
  const mockBrokers: Profile[] = [
    {
      id: 'broker_1',
      full_name: 'Tariq Al-Mansoor',
      agency_name: 'Apex Luxury Real Estate',
      email: 'tariq@apexrealty.ae',
      whatsapp_number: '+971 50 112 3344',
      role: 'agent',
      status: 'active',
      subscription_status: 'active',
      trial_expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'broker_2',
      full_name: 'Elena Rostova',
      agency_name: 'Skyline Capital Dubai',
      email: 'elena@skylinecapital.ae',
      whatsapp_number: '+971 52 987 6543',
      role: 'agent',
      status: 'active',
      subscription_status: 'trial',
      trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: '2026-10-21T08:30:00.000Z',
    },
    {
      id: 'broker_3',
      full_name: 'Sarah Jenkins',
      agency_name: 'Downtown Prime Brokers',
      email: 'sarah@downtownprime.ae',
      whatsapp_number: '+971 50 776 5544',
      role: 'agent',
      status: 'active',
      subscription_status: 'trial',
      trial_expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: '2026-10-15T11:00:00.000Z',
    },
    {
      id: 'broker_4',
      full_name: 'Fahad Bin Khalid',
      agency_name: 'Emirates Gold Assets',
      email: 'fahad@emiratesgold.ae',
      whatsapp_number: '+971 54 332 1100',
      role: 'agent',
      status: 'active',
      subscription_status: 'inactive',
      trial_expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: '2026-10-01T09:00:00.000Z',
    },
  ];

  const mockTransactions: PaymentTransaction[] = [
    {
      id: 'tx_seed_101',
      user_id: 'user_1',
      user_email: 'tariq@apexrealty.ae',
      amount_aed: 149,
      plan_id: 'monthly',
      payment_gateway: 'ziina',
      status: 'completed',
      created_at: '2026-10-20T12:00:00.000Z',
    },
    {
      id: 'tx_seed_102',
      user_id: 'user_2',
      user_email: 'elena@skylinecapital.ae',
      amount_aed: 119,
      plan_id: 'monthly',
      promo_code: 'SPECIAL20',
      payment_gateway: 'ziina',
      status: 'completed',
      created_at: '2026-10-18T15:30:00.000Z',
    },
  ];

  const mockMetrics = {
    mrrAed: 2682,
    cashCollected30d: 4120,
    activeCount: 18,
    trialCount: 27,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(marketingService, 'fetchRevenueMetrics').mockResolvedValue(mockMetrics);
    vi.spyOn(marketingService, 'fetchBrokerProfiles').mockResolvedValue(mockBrokers);
    vi.spyOn(marketingService, 'fetchPaymentTransactions').mockResolvedValue(mockTransactions);
  });

  it('renders KPI summary cards with revenue and subscriber counts', async () => {
    render(<AdminSubscriptions />);

    // Check loading or resolution of KPI values
    await waitFor(() => {
      expect(screen.getByText(/Contracted MRR/i)).toBeTruthy();
      expect(screen.getByText(/30-Day Cash Collected/i)).toBeTruthy();
      expect(screen.getByText(/Active Paying Brokers/i)).toBeTruthy();
      expect(screen.getByText(/Trial Pipeline/i)).toBeTruthy();
    });

    expect(screen.getByText(/2,682/)).toBeTruthy();
    expect(screen.getByText(/4,120/)).toBeTruthy();
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('27')).toBeTruthy();
  });

  it('renders broker directory table with correct broker names, agencies, and status badges', async () => {
    render(<AdminSubscriptions initialBrokers={mockBrokers} initialMetrics={mockMetrics} />);

    await waitFor(() => {
      expect(screen.getByText('Tariq Al-Mansoor')).toBeTruthy();
      expect(screen.getByText('Elena Rostova')).toBeTruthy();
      expect(screen.getByText('Sarah Jenkins')).toBeTruthy();
      expect(screen.getByText('Fahad Bin Khalid')).toBeTruthy();
    });

    // Check status badges
    expect(screen.getAllByText(/Active Member/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Trial: 3 days left/i)).toBeTruthy();
    expect(screen.getAllByText(/Trial Expired/i).length).toBeGreaterThan(0);
  });

  it('filters broker list by search query on name, agency, or email', async () => {
    render(<AdminSubscriptions initialBrokers={mockBrokers} initialMetrics={mockMetrics} />);

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(/Search brokers by name, agency, or email/i);

    // Search by agency
    fireEvent.change(searchInput, { target: { value: 'Skyline' } });
    expect(screen.getByText('Elena Rostova')).toBeTruthy();
    expect(screen.queryByText('Tariq Al-Mansoor')).toBeNull();
    expect(screen.queryByText('Sarah Jenkins')).toBeNull();

    // Search by email
    fireEvent.change(searchInput, { target: { value: 'sarah@downtownprime.ae' } });
    expect(screen.getByText('Sarah Jenkins')).toBeTruthy();
    expect(screen.queryByText('Elena Rostova')).toBeNull();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Tariq Al-Mansoor')).toBeTruthy();
    expect(screen.getByText('Elena Rostova')).toBeTruthy();
  });

  it('filters broker list by status pills (Active, In Trial, Expired, All)', async () => {
    render(<AdminSubscriptions initialBrokers={mockBrokers} initialMetrics={mockMetrics} />);

    await waitFor(() => {
      expect(screen.getByText('Tariq Al-Mansoor')).toBeTruthy();
    });

    // Filter "Active"
    fireEvent.click(screen.getByRole('button', { name: /^Active$/i }));
    expect(screen.getByText('Tariq Al-Mansoor')).toBeTruthy();
    expect(screen.queryByText('Elena Rostova')).toBeNull();
    expect(screen.queryByText('Sarah Jenkins')).toBeNull();

    // Filter "In Trial"
    fireEvent.click(screen.getByRole('button', { name: /^In Trial$/i }));
    expect(screen.getByText('Elena Rostova')).toBeTruthy();
    expect(screen.queryByText('Tariq Al-Mansoor')).toBeNull();
    expect(screen.queryByText('Sarah Jenkins')).toBeNull();

    // Filter "Expired"
    fireEvent.click(screen.getByRole('button', { name: /^Expired$/i }));
    expect(screen.getByText('Sarah Jenkins')).toBeTruthy();
    expect(screen.getByText('Fahad Bin Khalid')).toBeTruthy();
    expect(screen.queryByText('Tariq Al-Mansoor')).toBeNull();
    expect(screen.queryByText('Elena Rostova')).toBeNull();

    // Filter "All"
    fireEvent.click(screen.getByRole('button', { name: /^All$/i }));
    expect(screen.getByText('Tariq Al-Mansoor')).toBeTruthy();
    expect(screen.getByText('Elena Rostova')).toBeTruthy();
  });

  it('calls extendBrokerTrial and displays success feedback when clicking +3 Days or +5 Days', async () => {
    const extendTrialSpy = vi.spyOn(marketingService, 'extendBrokerTrial').mockImplementation(
      async (profileId, additionalDays = 3) => {
        const broker = mockBrokers.find((b) => b.id === profileId)!;
        return {
          ...broker,
          trial_expires_at: new Date(Date.now() + (3 + additionalDays) * 86400000).toISOString(),
          subscription_status: 'trial',
        };
      }
    );

    render(<AdminSubscriptions initialBrokers={mockBrokers} initialMetrics={mockMetrics} />);

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeTruthy();
    });

    // Find Elena's row action buttons
    const plus5Btn = screen.getByTestId('extend-trial-5-broker_2');
    fireEvent.click(plus5Btn);

    await waitFor(() => {
      expect(extendTrialSpy).toHaveBeenCalledWith('broker_2', 5, expect.anything());
      expect(screen.getByText(/Extended trial for Elena Rostova by \+5 days/i)).toBeTruthy();
    });

    // Click +3 Days on Sarah's row
    const plus3Btn = screen.getByTestId('extend-trial-3-broker_3');
    fireEvent.click(plus3Btn);

    await waitFor(() => {
      expect(extendTrialSpy).toHaveBeenCalledWith('broker_3', 3, expect.anything());
      expect(screen.getByText(/Extended trial for Sarah Jenkins by \+3 days/i)).toBeTruthy();
    });
  });

  it('calls grantBrokerVip when clicking Grant VIP and updates status', async () => {
    const grantVipSpy = vi.spyOn(marketingService, 'grantBrokerVip').mockImplementation(
      async (profileId) => {
        const broker = mockBrokers.find((b) => b.id === profileId)!;
        return {
          ...broker,
          subscription_status: 'active',
          status: 'active',
        };
      }
    );

    render(<AdminSubscriptions initialBrokers={mockBrokers} initialMetrics={mockMetrics} />);

    await waitFor(() => {
      expect(screen.getByText('Elena Rostova')).toBeTruthy();
    });

    const grantVipBtn = screen.getByTestId('grant-vip-broker_2');
    fireEvent.click(grantVipBtn);

    await waitFor(() => {
      expect(grantVipSpy).toHaveBeenCalledWith('broker_2', expect.anything());
      expect(screen.getByText(/VIP status granted to Elena Rostova/i)).toBeTruthy();
    });
  });

  it('renders recent transactions ledger with amounts and statuses', async () => {
    render(
      <AdminSubscriptions
        initialBrokers={mockBrokers}
        initialMetrics={mockMetrics}
        initialTransactions={mockTransactions}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Recent Payment Transactions/i)).toBeTruthy();
      expect(screen.getByText('tx_seed_101')).toBeTruthy();
      expect(screen.getByText('tx_seed_102')).toBeTruthy();
      expect(screen.getByText('149 AED')).toBeTruthy();
      expect(screen.getByText('119 AED')).toBeTruthy();
      expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
    });
  });
});
