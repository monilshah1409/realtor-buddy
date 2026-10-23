import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BrochureViewer from '../BrochureViewer';

describe('BrochureViewer Component', () => {
  const sampleUrl = 'https://onedrive.live.com/embed?resid=MOCK_ONEDRIVE_123';
  const fileName = 'Downtown_Tower_Specs.pdf';
  const title = 'Downtown Luxury Tower';

  it('renders iframe with provided brochure URL and controls', () => {
    render(<BrochureViewer brochureUrl={sampleUrl} fileName={fileName} title={title} />);

    const iframe = screen.getByTitle(new RegExp(title, 'i'));
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('src')).toContain(sampleUrl);

    // Download button / link
    const downloadLink = screen.getByRole('link', { name: /Download Brochure/i });
    expect(downloadLink).toBeTruthy();
    expect(downloadLink.getAttribute('href')).toBe(sampleUrl);
  });

  it('renders graceful fallback when no brochure URL is provided', () => {
    render(<BrochureViewer brochureUrl={undefined} fileName={undefined} title="No Brochure Property" />);

    expect(screen.getByText(/no brochure available/i)).toBeTruthy();
    expect(screen.queryByTitle(/No Brochure Property/i)).toBeNull();
  });

  it('handles zoom in, zoom out, and reset zoom controls', () => {
    render(<BrochureViewer brochureUrl={sampleUrl} fileName={fileName} title={title} />);

    // Initial zoom 100%
    expect(screen.getByText('100%')).toBeTruthy();

    const zoomInBtn = screen.getByRole('button', { name: /Zoom in/i });
    const zoomOutBtn = screen.getByRole('button', { name: /Zoom out/i });
    const resetZoomBtn = screen.getByRole('button', { name: /Reset zoom/i });

    // Zoom in
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('125%')).toBeTruthy();

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('150%')).toBeTruthy();

    // Zoom out
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('125%')).toBeTruthy();

    // Reset zoom
    fireEvent.click(resetZoomBtn);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('toggles fullscreen mode when fullscreen button is clicked', () => {
    const { container } = render(<BrochureViewer brochureUrl={sampleUrl} fileName={fileName} title={title} />);

    const fullscreenBtn = screen.getByRole('button', { name: /Full screen|Enter fullscreen/i });
    fireEvent.click(fullscreenBtn);

    // Check modal or fullscreen container presence
    expect(screen.getByRole('button', { name: /Exit full screen|Exit fullscreen/i })).toBeTruthy();

    // Exit fullscreen
    const exitBtn = screen.getByRole('button', { name: /Exit full screen|Exit fullscreen/i });
    fireEvent.click(exitBtn);
    expect(screen.getByRole('button', { name: /Full screen|Enter fullscreen/i })).toBeTruthy();
  });
});
