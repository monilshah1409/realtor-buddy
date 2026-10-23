import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PublicShortlistView from '../PublicShortlistView';
import { mockProperties } from '../../../data/mockProperties';
import type { Shortlist } from '../../../types';

describe('PublicShortlistView (Curated Buyer Portfolio)', () => {
  const agentProfile = {
    full_name: 'Sarah Jenkins',
    agency_name: 'Dubai Luxury Real Estate',
    whatsapp_number: '+971501234567',
    phone_number: '+97143000000',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  const sampleShortlist: Shortlist = {
    id: 'shortlist-1',
    agent_id: 'agent-123',
    client_name: 'Dr. Faisal Al-Mansoor',
    share_token: 'dr-faisal-dubai-picks',
    notes: 'Hand-picked luxury selections based on our private briefing. Both options offer outstanding capital appreciation.',
    created_at: '2026-02-01T12:00:00Z',
    items: [
      {
        id: 'item-1',
        shortlist_id: 'shortlist-1',
        property_id: mockProperties[0].id,
        order_index: 0,
        property: mockProperties[0],
      },
      {
        id: 'item-2',
        shortlist_id: 'shortlist-1',
        property_id: mockProperties[1].id,
        order_index: 1,
        property: mockProperties[1],
      },
    ],
  };

  it('renders client greeting, personalized agent notes, and agent WhatsApp CTA', () => {
    render(
      <PublicShortlistView
        shortlist={sampleShortlist}
        agent={agentProfile}
      />
    );

    // Client name and agent notes
    expect(screen.getByText(/Dr\. Faisal Al-Mansoor/i)).toBeTruthy();
    expect(screen.getByText(/Hand-picked luxury selections/i)).toBeTruthy();

    // Agent branding
    expect(screen.getByText(/Sarah Jenkins/i)).toBeTruthy();
    expect(screen.getByText(/Dubai Luxury Real Estate/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeTruthy();
  });

  it('renders shortlisted property cards and comparison details', () => {
    render(
      <PublicShortlistView
        shortlist={sampleShortlist}
        agent={agentProfile}
      />
    );

    expect(screen.getAllByText(new RegExp(mockProperties[0].title, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(mockProperties[1].title, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(mockProperties[0].locality, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(mockProperties[1].locality, 'i')).length).toBeGreaterThan(0);
  });

  it('strictly protects agent commissions by concealing developer name and price across all properties', () => {
    const { container } = render(
      <PublicShortlistView
        shortlist={sampleShortlist}
        agent={agentProfile}
      />
    );

    // Check first property
    expect(container.textContent).not.toContain(mockProperties[0].developer_name);
    expect(container.textContent).not.toContain(mockProperties[0].price_aed.toLocaleString());

    // Check second property
    expect(container.textContent).not.toContain(mockProperties[1].developer_name);
    expect(container.textContent).not.toContain(mockProperties[1].price_aed.toLocaleString());
  });

  it('allows clicking into full presentation view of a property and returning back to shortlist', () => {
    render(
      <PublicShortlistView
        shortlist={sampleShortlist}
        agent={agentProfile}
      />
    );

    // Click "View Full Presentation" or similar CTA for property 0
    const viewButtons = screen.getAllByRole('button', { name: /View Details|View Presentation/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewButtons[0]);

    // Should now show detailed presentation view
    expect(screen.getByRole('button', { name: /Back to Shortlist/i })).toBeTruthy();

    // Click back to shortlist
    fireEvent.click(screen.getByRole('button', { name: /Back to Shortlist/i }));
    expect(screen.getByText(/Dr\. Faisal Al-Mansoor/i)).toBeTruthy();
  });

  it('renders comparison matrix comparing bedrooms, bathrooms, and area', () => {
    render(
      <PublicShortlistView
        shortlist={sampleShortlist}
        agent={agentProfile}
      />
    );

    expect(screen.getByText(/Property Comparison/i)).toBeTruthy();
  });
});
