import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PropertyList from '../PropertyList';
import { mockProperties } from '../../../data/mockProperties';

describe('PropertyList', () => {
  it('renders count header and cards for properties', () => {
    render(
      <PropertyList
        properties={mockProperties}
        onSelectProperty={() => {}}
      />
    );

    expect(
      screen.getByText(new RegExp(`Showing ${mockProperties.length} matching properties in Dubai`, 'i'))
    ).toBeTruthy();
    expect(screen.getAllByRole('article').length).toBe(mockProperties.length);
  });

  it('renders empty state when properties list is empty', () => {
    const handleReset = vi.fn();
    render(
      <PropertyList
        properties={[]}
        onResetFilters={handleReset}
      />
    );

    expect(screen.getByText(/no matching properties found/i)).toBeTruthy();
    const resetBtn = screen.getByRole('button', { name: /reset all filters/i });
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalled();
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<PropertyList properties={[]} isLoading={true} />);
    expect(screen.getByTestId('property-list-loading')).toBeTruthy();
  });

  it('marks shortlisted properties with isShortlisted state', () => {
    render(
      <PropertyList
        properties={mockProperties}
        shortlistedIds={[mockProperties[0].id]}
      />
    );

    expect(screen.getByText(/shortlisted/i)).toBeTruthy();
  });
});
