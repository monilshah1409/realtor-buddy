import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../Dashboard';
import { mockProperties } from '../../data/mockProperties';
import { AGENT_PROFILE } from '../../components/layout/Navbar';

describe('Dashboard Component', () => {
  it('renders split view with FilterBar, PropertyList, and DubaiMap', () => {
    render(
      <Dashboard
        properties={mockProperties}
        agentProfile={AGENT_PROFILE}
        shortlistedIds={['prop-1']}
        onToggleShortlist={vi.fn()}
        onClearShortlist={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(/Search Dubai community/i)).toBeInTheDocument();
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('property-list')).toBeInTheDocument();
    expect(screen.getByTestId('dubai-map-wrapper')).toBeInTheDocument();
  });

  it('filters property cards based on live search query', () => {
    render(
      <Dashboard
        properties={mockProperties}
        agentProfile={AGENT_PROFILE}
        shortlistedIds={[]}
        onToggleShortlist={vi.fn()}
        onClearShortlist={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search Dubai community/i);
    fireEvent.change(searchInput, { target: { value: 'Downtown' } });

    expect(screen.getByTestId('property-count-header')).toHaveTextContent(/matching/i);
  });

  it('opens shortlist drawer and allows copying link or clearing', () => {
    const handleClearShortlist = vi.fn();
    const handleToggleShortlist = vi.fn();

    render(
      <Dashboard
        properties={mockProperties}
        agentProfile={AGENT_PROFILE}
        shortlistedIds={['prop-1', 'prop-2']}
        onToggleShortlist={handleToggleShortlist}
        onClearShortlist={handleClearShortlist}
        onNavigate={vi.fn()}
        isShortlistDrawerOpen={true}
      />
    );

    expect(screen.getByTestId('shortlist-drawer')).toBeInTheDocument();
    expect(screen.getByText('Client Shortlist Tray')).toBeInTheDocument();
    expect(screen.getByText('2 properties selected')).toBeInTheDocument();

    const clearBtn = screen.getByText('Clear All Items');
    fireEvent.click(clearBtn);
    expect(handleClearShortlist).toHaveBeenCalled();
  });
});
