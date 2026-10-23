import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilterBar from '../FilterBar';
import type { MatchCriteria } from '../../../types';

describe('FilterBar', () => {
  it('renders all filter sections properly', () => {
    render(<FilterBar onChange={() => {}} onReset={() => {}} />);
    
    // Locality
    expect(screen.getByLabelText(/locality/i)).toBeTruthy();
    // Property Type
    expect(screen.getByText(/Property Type/i)).toBeTruthy();
    // Handover Status
    expect(screen.getByText(/Handover Timeline/i)).toBeTruthy();
    // Budget
    expect(screen.getByLabelText(/Target Budget/i)).toBeTruthy();
    // Budget stretch slider
    expect(screen.getByLabelText(/Budget Stretch/i)).toBeTruthy();
    // Min sqft
    expect(screen.getByLabelText(/Min Area/i)).toBeTruthy();
  });

  it('selects locality from dropdown and calls onChange', () => {
    const handleChange = vi.fn();
    render(<FilterBar onChange={handleChange} onReset={() => {}} />);
    
    const localitySelect = screen.getByLabelText(/locality/i);
    fireEvent.change(localitySelect, { target: { value: 'Downtown Dubai' } });
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ targetLocality: 'Downtown Dubai' })
    );
  });

  it('selects property type tab and calls onChange', () => {
    const handleChange = vi.fn();
    render(<FilterBar onChange={handleChange} onReset={() => {}} />);
    
    const villaTab = screen.getByRole('button', { name: /^villa$/i });
    fireEvent.click(villaTab);
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: 'villa' })
    );
  });

  it('allows deselecting or switching property type tab', () => {
    const handleChange = vi.fn();
    render(
      <FilterBar 
        initialCriteria={{ propertyType: 'villa' }} 
        onChange={handleChange} 
        onReset={() => {}} 
      />
    );
    
    // Clicking the already selected tab deselects it (or selecting 'All')
    const villaTab = screen.getByRole('button', { name: /^villa$/i });
    fireEvent.click(villaTab);
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: undefined })
    );
  });

  it('selects handover status pill and calls onChange', () => {
    const handleChange = vi.fn();
    render(<FilterBar onChange={handleChange} onReset={() => {}} />);
    
    const readyPill = screen.getByRole('button', { name: /ready to move in/i });
    fireEvent.click(readyPill);
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ preferredHandover: 'ready' })
    );
  });

  it('updates budget in AED and calls onChange', () => {
    const handleChange = vi.fn();
    render(<FilterBar onChange={handleChange} onReset={() => {}} />);
    
    const budgetInput = screen.getByLabelText(/Target Budget/i);
    fireEvent.change(budgetInput, { target: { value: '2500000' } });
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ targetBudgetAed: 2500000 })
    );
  });

  it('adjusts budget stretch slider between 0% and 30% with default 15%', () => {
    const handleChange = vi.fn();
    render(<FilterBar onChange={handleChange} onReset={() => {}} />);
    
    const slider = screen.getByLabelText(/Budget Stretch/i) as HTMLInputElement;
    expect(slider.value).toBe('15');
    expect(screen.getByText(/\+15%/)).toBeTruthy();

    fireEvent.change(slider, { target: { value: '25' } });
    expect(slider.value).toBe('25');
    expect(screen.getByText(/\+25%/)).toBeTruthy();
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ budgetStretchPercent: 25 })
    );
  });

  it('updates minimum sqft input and calls onChange', () => {
    const handleChange = vi.fn();
    render(<FilterBar onChange={handleChange} onReset={() => {}} />);
    
    const sqftInput = screen.getByLabelText(/Min Area/i);
    fireEvent.change(sqftInput, { target: { value: '1200' } });
    
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ minSqft: 1200 })
    );
  });

  it('resets all filters to default when Reset button is clicked', () => {
    const handleChange = vi.fn();
    const handleReset = vi.fn();
    render(
      <FilterBar 
        initialCriteria={{
          targetLocality: 'Downtown Dubai',
          targetBudgetAed: 2000000,
          budgetStretchPercent: 20,
          propertyType: '2bhk',
          preferredHandover: 'ready',
          minSqft: 1000,
        }}
        onChange={handleChange} 
        onReset={handleReset} 
      />
    );
    
    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);
    
    expect(handleReset).toHaveBeenCalled();
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        targetLocality: '',
        targetBudgetAed: undefined,
        budgetStretchPercent: 15,
        propertyType: undefined,
        preferredHandover: undefined,
        minSqft: undefined,
      })
    );
  });
});
