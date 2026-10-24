import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import AdminMarketing from '../AdminMarketing';
import * as marketingService from '../../../services/marketingService';
import type { MarketingCampaign } from '../../../types';

describe('AdminMarketing Component', () => {
  const mockCampaigns: MarketingCampaign[] = [
    {
      id: 'camp_trial_day_3',
      title: 'Trial Day 3 Feature Discovery',
      trigger_type: 'trial_day_3',
      subject: 'Discover Off-Plan Wholesale Pricing & Shortlist Exporting',
      content_html:
        '<p>Explore the full inventory of luxury off-plan developments across Dubai, download broker-ready branded brochures, and export curated client shortlists.</p>',
      is_active: true,
      audience: 'trial',
      created_at: '2026-10-24T00:00:00.000Z',
      updated_at: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'camp_trial_expiring_24h',
      title: 'Trial 24h Expiration Alert',
      trigger_type: 'trial_expiring_24h',
      subject: 'Your 5-Day Free Trial expires tomorrow — Continue for 149 AED/mo',
      content_html:
        '<p>Your 5-day full-access trial ends tomorrow. Continue unlocking wholesale Dubai off-plan developments and priority developer launches for only 149 AED/month.</p>',
      is_active: true,
      audience: 'trial',
      created_at: '2026-10-24T00:00:00.000Z',
      updated_at: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'camp_trial_expired_winback',
      title: 'Trial Expired Win-Back Offer',
      trigger_type: 'trial_expired_winback',
      subject: 'Special 20% discount code to continue your Dubai access',
      content_html:
        '<p>We would love to keep partnering with your brokerage. Use promo code <strong>SPECIAL20</strong> to reactivate your access with an exclusive 20% savings.</p>',
      is_active: true,
      audience: 'expired',
      created_at: '2026-10-24T00:00:00.000Z',
      updated_at: '2026-10-24T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    marketingService.resetMarketingStore();
    vi.restoreAllMocks();
  });

  it('renders Automated Marketing Triggers section with pre-set campaigns and toggle switches', () => {
    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    // Section title
    expect(screen.getByText(/Automated Lifecycle Drips/i)).toBeInTheDocument();

    // 3 Pre-set campaigns
    expect(screen.getByText(/Day 3/i)).toBeInTheDocument();
    expect(screen.getByText(/24h Expiration/i)).toBeInTheDocument();
    expect(screen.getByText(/Win-Back/i)).toBeInTheDocument();

    // Verify toggle switches exist
    const toggles = screen.getAllByRole('switch');
    expect(toggles.length).toBe(3);
    toggles.forEach((toggle) => {
      expect(toggle).toBeChecked();
    });

    // Verify Preview Template buttons exist
    const previewButtons = screen.getAllByRole('button', { name: /Preview Template/i });
    expect(previewButtons.length).toBe(3);
  });

  it('fetches marketing campaigns from marketingService when initialCampaigns is not provided', async () => {
    const fetchSpy = vi
      .spyOn(marketingService, 'fetchMarketingCampaigns')
      .mockResolvedValueOnce(mockCampaigns);

    render(<AdminMarketing />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
      expect(screen.getByText(/Trial Day 3 Feature Discovery/i)).toBeInTheDocument();
    });
  });

  it('toggles automated campaign status via toggleMarketingCampaign with optimistic UI update', async () => {
    const toggleSpy = vi
      .spyOn(marketingService, 'toggleMarketingCampaign')
      .mockResolvedValueOnce(true);

    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const toggles = screen.getAllByRole('switch');
    const firstToggle = toggles[0];
    expect(firstToggle).toBeChecked();

    // Toggle off
    fireEvent.click(firstToggle);

    expect(toggleSpy).toHaveBeenCalledWith('camp_trial_day_3', false);
    expect(firstToggle).not.toBeChecked();

    // Feedback toast appears
    await waitFor(() => {
      expect(screen.getByText(/Paused automated trigger/i)).toBeInTheDocument();
    });
  });

  it('opens and closes email template preview modal', async () => {
    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const previewButtons = screen.getAllByRole('button', { name: /Preview Template/i });
    fireEvent.click(previewButtons[0]);

    // Modal opens showing template details
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Template Preview:/i)).toBeInTheDocument();
    expect(
      screen.getByText('Discover Off-Plan Wholesale Pricing & Shortlist Exporting')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore the full inventory of luxury off-plan developments/i)
    ).toBeInTheDocument();

    // Close modal via close button
    const closeBtn = screen.getByRole('button', { name: /Close Preview/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders broadcast email composer with audience selector, subject, body editor, and live preview', () => {
    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    expect(screen.getByText(/Broadcast Email Composer/i)).toBeInTheDocument();

    // Audience dropdown
    const audienceSelect = screen.getByLabelText(/Target Audience/i) as HTMLSelectElement;
    expect(audienceSelect).toBeInTheDocument();
    expect(audienceSelect.value).toBe('all');
    expect(screen.getByRole('option', { name: /All Brokers/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Active Subscribers/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Active 5-Day Trials/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Expired Trials/i })).toBeInTheDocument();

    // Subject input and character counter
    const subjectInput = screen.getByLabelText(/Subject Line/i);
    expect(subjectInput).toBeInTheDocument();
    expect(screen.getByText(/characters/i)).toBeInTheDocument();

    // Body editor
    const bodyEditor = screen.getByLabelText(/Email Body/i);
    expect(bodyEditor).toBeInTheDocument();

    // Send button
    expect(
      screen.getByRole('button', { name: /Send Broadcast Email/i })
    ).toBeInTheDocument();

    // Live preview pane
    expect(screen.getByText(/Live Luxury Email Preview/i)).toBeInTheDocument();
  });

  it('updates live luxury email preview in real time when typing subject and body', () => {
    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const subjectInput = screen.getByLabelText(/Subject Line/i);
    const bodyEditor = screen.getByLabelText(/Email Body/i);

    fireEvent.change(subjectInput, {
      target: { value: 'Exclusive Dubai Marina Sky Villa Launch' },
    });
    fireEvent.change(bodyEditor, {
      target: {
        value: '<p>Direct allocation for premier brokerages starting from 8.5M AED.</p>',
      },
    });

    // Subject and body in live preview
    expect(
      screen.getByTestId('preview-subject')
    ).toHaveTextContent('Exclusive Dubai Marina Sky Villa Launch');
    expect(
      screen.getByTestId('preview-body')
    ).toHaveTextContent('Direct allocation for premier brokerages starting from 8.5M AED.');
  });

  it('inserts template variables into subject line when variable pills are clicked', () => {
    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const subjectInput = screen.getByLabelText(/Subject Line/i) as HTMLInputElement;
    fireEvent.change(subjectInput, { target: { value: 'Welcome ' } });

    const brokerNamePill = screen.getByRole('button', { name: /\{\{broker_name\}\}/i });
    fireEvent.click(brokerNamePill);

    expect(subjectInput.value).toBe('Welcome {{broker_name}}');
  });

  it('disables Send Broadcast Email button when subject or body is empty', () => {
    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const sendButton = screen.getByRole('button', { name: /Send Broadcast Email/i });
    const subjectInput = screen.getByLabelText(/Subject Line/i);
    const bodyEditor = screen.getByLabelText(/Email Body/i);

    // Default empty inputs
    fireEvent.change(subjectInput, { target: { value: '' } });
    fireEvent.change(bodyEditor, { target: { value: '' } });
    expect(sendButton).toBeDisabled();

    // Only subject filled
    fireEvent.change(subjectInput, { target: { value: 'Valid Subject' } });
    expect(sendButton).toBeDisabled();

    // Both filled
    fireEvent.change(bodyEditor, { target: { value: '<p>Content</p>' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('sends broadcast email via sendBroadcastEmail and displays success feedback with stats', async () => {
    const sendSpy = vi
      .spyOn(marketingService, 'sendBroadcastEmail')
      .mockResolvedValueOnce({ success: true, dispatchedCount: 24 });

    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const audienceSelect = screen.getByLabelText(/Target Audience/i);
    const subjectInput = screen.getByLabelText(/Subject Line/i);
    const bodyEditor = screen.getByLabelText(/Email Body/i);
    const sendButton = screen.getByRole('button', { name: /Send Broadcast Email/i });

    fireEvent.change(audienceSelect, { target: { value: 'trial' } });
    fireEvent.change(subjectInput, {
      target: { value: 'Priority Invitation: Off-Plan VIP Briefing' },
    });
    fireEvent.change(bodyEditor, {
      target: {
        value: '<p>Join our private briefing on Dubai Creek Harbour developments.</p>',
      },
    });

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith({
        audience: 'trial',
        subject: 'Priority Invitation: Off-Plan VIP Briefing',
        htmlContent: '<p>Join our private briefing on Dubai Creek Harbour developments.</p>',
      });
      expect(screen.getByText(/Broadcast sent to 24 brokers/i)).toBeInTheDocument();
    });
  });

  it('handles broadcast email failure and shows error message', async () => {
    vi.spyOn(marketingService, 'sendBroadcastEmail').mockRejectedValueOnce(
      new Error('Failed to deliver message via Resend')
    );

    render(<AdminMarketing initialCampaigns={mockCampaigns} />);

    const subjectInput = screen.getByLabelText(/Subject Line/i);
    const bodyEditor = screen.getByLabelText(/Email Body/i);
    const sendButton = screen.getByRole('button', { name: /Send Broadcast Email/i });

    fireEvent.change(subjectInput, { target: { value: 'Urgent System Notice' } });
    fireEvent.change(bodyEditor, { target: { value: '<p>Maintenance tonight.</p>' } });

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to deliver message via Resend/i)
      ).toBeInTheDocument();
    });
  });
});
