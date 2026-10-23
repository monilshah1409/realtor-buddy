import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PublicPropertyView from '../PublicPropertyView';
import { mockProperties } from '../../../data/mockProperties';

describe('PublicPropertyView (Buyer Presentation)', () => {
  const property = mockProperties[0];
  const agentProfile = {
    full_name: 'Sarah Jenkins',
    agency_name: 'Dubai Luxury Real Estate',
    whatsapp_number: '+971501234567',
    phone_number: '+97143000000',
    avatar_url: 'https://example.com/avatar.jpg',
  };

  it('renders property specs, handover date, and agent WhatsApp CTA without price or developer', () => {
    const { container } = render(<PublicPropertyView property={property} agent={agentProfile} />);
    
    // Shows agent branding
    expect(screen.getByText(/Sarah Jenkins/i)).toBeTruthy();
    expect(screen.getByText(/Dubai Luxury Real Estate/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeTruthy();
    
    // Shows handover timeline and specs
    expect(screen.getByText(new RegExp(property.handover_date, 'i'))).toBeTruthy();
    expect(screen.getByText(new RegExp(property.locality, 'i'))).toBeTruthy();
    
    // CRITICAL: NEVER reveals price or developer
    expect(container.textContent).not.toContain(property.developer_name);
    expect(container.textContent).not.toContain(property.price_aed.toLocaleString());
  });

  it('renders key property specifications: bedrooms, bathrooms, and area sq ft', () => {
    render(<PublicPropertyView property={property} agent={agentProfile} />);

    expect(screen.getByText(new RegExp(`${property.bedrooms}\\s*(Bed|Bedroom)`, 'i'))).toBeTruthy();
    expect(screen.getByText(new RegExp(`${property.bathrooms}\\s*(Bath|Bathroom)`, 'i'))).toBeTruthy();
    expect(screen.getByText(new RegExp(`${property.area_sqft.toLocaleString()}\\s*sq\\s*ft`, 'i'))).toBeTruthy();
  });

  it('renders handover badge for ready vs off-plan properties', () => {
    // Ready property
    const { rerender } = render(<PublicPropertyView property={property} agent={agentProfile} />);
    expect(screen.getByText(/Ready to Move In/i)).toBeTruthy();

    // Off-plan property
    const offPlanProperty = mockProperties[1]; // Q4 2026
    rerender(<PublicPropertyView property={offPlanProperty} agent={agentProfile} />);
    expect(screen.getByText(new RegExp(offPlanProperty.handover_date, 'i'))).toBeTruthy();
  });

  it('allows navigating photo gallery and toggling full-screen modal', () => {
    render(<PublicPropertyView property={property} agent={agentProfile} />);

    // Check main image
    const mainImg = screen.getByTestId('main-gallery-image') as HTMLImageElement;
    expect(mainImg).toBeTruthy();
    expect(mainImg.src).toContain(property.photos[0]);

    // Click next photo button if multiple photos exist
    const nextBtn = screen.getByRole('button', { name: /Next photo/i });
    fireEvent.click(nextBtn);
    expect((screen.getByTestId('main-gallery-image') as HTMLImageElement).src).toContain(property.photos[1]);

    // Toggle fullscreen lightbox
    const fullscreenBtn = screen.getByRole('button', { name: /View fullscreen/i });
    fireEvent.click(fullscreenBtn);
    expect(screen.getByTestId('fullscreen-lightbox')).toBeTruthy();

    // Close lightbox
    const closeBtn = screen.getByRole('button', { name: /Close fullscreen/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('fullscreen-lightbox')).toBeNull();
  });

  it('embeds brochure viewer when brochure URL is provided', () => {
    render(<PublicPropertyView property={property} agent={agentProfile} />);
    expect(screen.getByTestId('brochure-viewer')).toBeTruthy();
  });

  it('displays agent phone call button and verified license badge', () => {
    render(<PublicPropertyView property={property} agent={agentProfile} />);

    const callLink = screen.getByRole('link', { name: /Call/i });
    expect(callLink).toBeTruthy();
    expect(callLink.getAttribute('href')).toContain(agentProfile.phone_number);

    expect(screen.getByText(/RERA Verified/i)).toBeTruthy();
  });

  it('renders gracefully when agent profile is omitted or partial', () => {
    render(<PublicPropertyView property={property} />);
    expect(screen.getByText(/Verified Dubai Realtor/i)).toBeTruthy();
  });

  it('strictly protects agent commissions by concealing developer name and price under all circumstances', () => {
    const sensitiveProperty = {
      ...mockProperties[0],
      developer_name: 'TopSecretDeveloperEmpire',
      price_aed: 8976543,
    };

    const { container } = render(<PublicPropertyView property={sensitiveProperty} agent={agentProfile} />);

    expect(container.textContent).not.toContain('TopSecretDeveloperEmpire');
    expect(container.textContent).not.toContain('8976543');
    expect(container.textContent).not.toContain('8,976,543');
    expect(container.innerHTML).not.toContain('TopSecretDeveloperEmpire');
    expect(container.innerHTML).not.toContain('8,976,543');
  });
});
