import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminApprovals from '../AdminApprovals';
import { mockProperties } from '../../../data/mockProperties';
import type { Property } from '../../../types';

describe('AdminApprovals Dashboard', () => {
  const pendingProp1: Property = {
    ...mockProperties[0],
    id: 'pending-prop-1',
    title: 'Sobha Hartland Waterfront Penthouse',
    developer_name: 'Sobha Realty',
    price_aed: 3850000,
    locality: 'Sobha Hartland',
    handover_date: 'Q3 2026',
    bedrooms: 3,
    bathrooms: 4,
    area_sqft: 2400,
    created_by: 'agent-123',
    status: 'private',
    brochure_onedrive_url: 'https://onedrive.live.com/embed?resid=SOBHA_BROCHURE_123',
    brochure_file_name: 'Sobha_Waterfront_Spec_Sheet.pdf',
  };

  const pendingProp2: Property = {
    ...mockProperties[1],
    id: 'pending-prop-2',
    title: 'Damac Lagoons Townhouse',
    developer_name: 'Damac Properties',
    price_aed: 1950000,
    locality: 'Damac Lagoons',
    handover_date: 'Ready',
    bedrooms: 4,
    bathrooms: 4,
    area_sqft: 2200,
    created_by: 'agent-456',
    status: 'private',
    brochure_onedrive_url: 'https://onedrive.live.com/embed?resid=DAMAC_BROCHURE_456',
    brochure_file_name: 'Damac_Lagoons_Catalog.pdf',
  };

  it('renders pending properties with brochure viewer and approve button', async () => {
    const handleApprove = vi.fn();
    render(<AdminApprovals pendingProperties={[pendingProp1]} onApprove={handleApprove} onReject={() => {}} />);
    
    expect(screen.getByText(new RegExp(pendingProp1.title, 'i'))).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve as Global/i })).toBeTruthy();
    
    fireEvent.click(screen.getByRole('button', { name: /Approve as Global/i }));
    await waitFor(() => {
      expect(handleApprove).toHaveBeenCalledWith(pendingProp1.id);
    });
  });

  it('renders full property specifications for side-by-side verification', () => {
    render(<AdminApprovals pendingProperties={[pendingProp1]} />);

    // Inspect specs: Developer, Wholesale Price, Locality, Handover, Beds/Baths/Sqft, Agent
    expect(screen.getAllByText(new RegExp(pendingProp1.developer_name, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3,850,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(pendingProp1.locality, 'i')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Q3 2026/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 Bed/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 Bath/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2,400 sqft/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/agent-123/i).length).toBeGreaterThan(0);
  });

  it('allows admin to switch between properties in the queue', () => {
    render(<AdminApprovals pendingProperties={[pendingProp1, pendingProp2]} />);

    // Initially pendingProp1 is active
    expect(screen.getAllByText(new RegExp(pendingProp1.title, 'i')).length).toBeGreaterThan(0);

    // Click on pendingProp2 in queue
    const prop2Card = screen.getByTestId(`approval-item-${pendingProp2.id}`);
    fireEvent.click(prop2Card);

    // Detailed inspection pane now displays pendingProp2 specs
    expect(screen.getAllByText(/1,950,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(pendingProp2.developer_name, 'i')).length).toBeGreaterThan(0);
  });

  it('handles rejection / change request with optional reason', async () => {
    const handleReject = vi.fn();
    render(<AdminApprovals pendingProperties={[pendingProp1]} onReject={handleReject} />);

    const rejectButton = screen.getByRole('button', { name: /Request Changes|Reject/i });
    expect(rejectButton).toBeTruthy();
    fireEvent.click(rejectButton);

    // If modal/reason prompt appears
    const reasonInput = screen.getByPlaceholderText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Floor plan page is unreadable' } });

    const confirmRejectBtn = screen.getByRole('button', { name: /Confirm Rejection|Submit Feedback/i });
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(handleReject).toHaveBeenCalledWith(pendingProp1.id, 'Floor plan page is unreadable');
    });
  });

  it('renders empty state when there are no pending properties', () => {
    render(<AdminApprovals pendingProperties={[]} />);

    expect(screen.getByText(/no pending/i)).toBeTruthy();
  });
});
