import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PropertyCard from '../PropertyCard';
import { mockProperties } from '../../../data/mockProperties';

describe('PropertyCard', () => {
  it('displays wholesale price and developer for authenticated agents', () => {
    const prop = mockProperties[0];
    render(
      <PropertyCard 
        property={prop} 
        score={{ totalScore: 94, localityTag: 'Target Location', isStretchMatch: false, isWithinBudget: true, budgetTag: 'Within Budget' }} 
        onAddToShortlist={() => {}}
      />
    );
    expect(screen.getByText(new RegExp(prop.developer_name, 'i'))).toBeTruthy();
    expect(screen.getByText(/AED/i)).toBeTruthy();
    expect(screen.getByText(/94% Match/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(prop.handover_date, 'i'))).toBeTruthy();
  });

  it('renders property specifications accurately (beds, baths, sqft)', () => {
    const prop = mockProperties[0]; // 1 bed, 2 bath, 850 sqft
    render(<PropertyCard property={prop} />);
    expect(screen.getByText(/1 Bed/i)).toBeTruthy();
    expect(screen.getByText(/2 Bath/i)).toBeTruthy();
    expect(screen.getByText(/850 sqft/i)).toBeTruthy();
  });

  it('renders Studio when bedrooms is 0', () => {
    const studioProp = mockProperties.find(p => p.bedrooms === 0) || {
      ...mockProperties[0],
      id: 'studio-test',
      bedrooms: 0,
      property_type: 'studio' as const,
    };
    render(<PropertyCard property={studioProp} />);
    expect(screen.getAllByText(/Studio/i).length).toBeGreaterThan(0);
  });

  it('renders locality and sub-community badge', () => {
    const prop = mockProperties[0]; // Downtown Dubai, Opera District
    render(<PropertyCard property={prop} />);
    expect(screen.getByText(/Downtown Dubai/i)).toBeTruthy();
    if (prop.sub_community) {
      expect(screen.getByText(new RegExp(prop.sub_community, 'i'))).toBeTruthy();
    }
  });

  it('handles fallback image when photo list is empty or image fails to load', () => {
    const noPhotoProp = {
      ...mockProperties[0],
      photos: [],
    };
    render(<PropertyCard property={noPhotoProp} />);
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBeTruthy();
  });

  it('calls onAddToShortlist when Add to Shortlist button is clicked', () => {
    const prop = mockProperties[0];
    const handleAddToShortlist = vi.fn();
    render(<PropertyCard property={prop} onAddToShortlist={handleAddToShortlist} />);
    
    const shortlistBtn = screen.getByRole('button', { name: /shortlist/i });
    fireEvent.click(shortlistBtn);
    expect(handleAddToShortlist).toHaveBeenCalledWith(prop);
  });

  it('shows shortlisted status when isShortlisted is true', () => {
    const prop = mockProperties[0];
    render(<PropertyCard property={prop} isShortlisted={true} />);
    expect(screen.getByText(/shortlisted/i)).toBeTruthy();
  });

  it('calls onShareLink when Share button is clicked', () => {
    const prop = mockProperties[0];
    const handleShare = vi.fn();
    render(<PropertyCard property={prop} onShareLink={handleShare} />);
    
    const shareBtn = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareBtn);
    expect(handleShare).toHaveBeenCalledWith(prop);
  });

  it('calls onSelect when the card is clicked', () => {
    const prop = mockProperties[0];
    const handleSelect = vi.fn();
    const { container } = render(<PropertyCard property={prop} onSelect={handleSelect} />);
    
    const card = container.firstElementChild as HTMLElement;
    fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalledWith(prop.id);
  });

  it('styles match score badge based on score tier (emerald, amber, sky)', () => {
    const prop = mockProperties[0];
    
    // Emerald tier (high score)
    const { unmount } = render(
      <PropertyCard
        property={prop}
        score={{ totalScore: 92, localityTag: 'Target Location', isStretchMatch: false, isWithinBudget: true, budgetTag: 'Within Budget' }}
      />
    );
    expect(screen.getByTestId('property-card-score-badge')).toHaveClass('bg-emerald-50');
    unmount();

    // Amber tier (stretch match)
    render(
      <PropertyCard
        property={prop}
        score={{ totalScore: 78, localityTag: 'Target Location', isStretchMatch: true, isWithinBudget: false, budgetTag: 'High-Value Stretch' }}
      />
    );
    expect(screen.getByTestId('property-card-score-badge')).toHaveClass('bg-amber-50');
  });

  it('hides developer name and wholesale price when showAgentDetails is false', () => {
    const prop = mockProperties[0];
    render(<PropertyCard property={prop} showAgentDetails={false} />);
    expect(screen.queryByText(new RegExp(prop.developer_name, 'i'))).toBeNull();
    expect(screen.queryByText(new RegExp(prop.price_aed.toLocaleString(), 'i'))).toBeNull();
  });
});
