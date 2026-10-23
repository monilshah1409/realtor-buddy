import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyForm } from '../PropertyForm';
import * as storageService from '../../../services/storageService';
import type { Property } from '../../../types';

vi.mock('../../../services/storageService', () => ({
  uploadBrochureToOneDrive: vi.fn(),
  compressAndUploadPhoto: vi.fn(),
}));

describe('PropertyForm Component', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form input fields', () => {
    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/Property Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Locality/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sub-Community/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Property Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Handover Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Handover Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Price \(AED\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Developer Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bedrooms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bathrooms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Area \(sqft\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Longitude/i)).toBeInTheDocument();
  });

  it('populates default coordinates when a Dubai locality is selected', async () => {
    const user = userEvent.setup();
    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const localitySelect = screen.getByLabelText(/Locality/i);
    await user.selectOptions(localitySelect, 'Downtown Dubai');

    const latInput = screen.getByLabelText(/Latitude/i) as HTMLInputElement;
    const lngInput = screen.getByLabelText(/Longitude/i) as HTMLInputElement;

    expect(Number(latInput.value)).toBeCloseTo(25.1972, 3);
    expect(Number(lngInput.value)).toBeCloseTo(55.2744, 3);
  });

  it('uploads desktop PDF brochure and displays file preview', async () => {
    (storageService.uploadBrochureToOneDrive as any).mockResolvedValueOnce({
      fileName: 'burj_sky_residence.pdf',
      webUrl: 'https://1drv.ms/b/mock-burj',
      embedUrl: 'https://onedrive.live.com/embed?resid=MOCK123',
    });

    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const pdfInput = screen.getByTestId('brochure-file-input');
    const mockFile = new File(['%PDF-1.4'], 'burj_sky_residence.pdf', { type: 'application/pdf' });

    fireEvent.change(pdfInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(storageService.uploadBrochureToOneDrive).toHaveBeenCalledWith(mockFile);
      expect(screen.getByText('burj_sky_residence.pdf')).toBeInTheDocument();
    });

    // Remove brochure
    const removeBtn = screen.getByRole('button', { name: /remove brochure/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText('burj_sky_residence.pdf')).not.toBeInTheDocument();
  });

  it('uploads photos and displays image previews with remove capability', async () => {
    (storageService.compressAndUploadPhoto as any)
      .mockResolvedValueOnce('https://cdn.supabase.co/photo1.webp')
      .mockResolvedValueOnce('https://cdn.supabase.co/photo2.webp');

    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const photoInput = screen.getByTestId('photos-file-input');
    const file1 = new File(['img1'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['img2'], 'photo2.jpg', { type: 'image/jpeg' });

    fireEvent.change(photoInput, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(storageService.compressAndUploadPhoto).toHaveBeenCalledTimes(2);
      const images = screen.getAllByRole('img');
      expect(images.some((img) => img.getAttribute('src') === 'https://cdn.supabase.co/photo1.webp')).toBe(true);
      expect(images.some((img) => img.getAttribute('src') === 'https://cdn.supabase.co/photo2.webp')).toBe(true);
    });

    // Remove the first image
    const removeButtons = screen.getAllByRole('button', { name: /remove photo/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      const remainingImages = screen.queryAllByRole('img');
      expect(remainingImages.some((img) => img.getAttribute('src') === 'https://cdn.supabase.co/photo1.webp')).toBe(false);
      expect(remainingImages.some((img) => img.getAttribute('src') === 'https://cdn.supabase.co/photo2.webp')).toBe(true);
    });
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitBtn = screen.getByRole('button', { name: /create property|save property/i });
    await user.click(submitBtn);

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it('submits form with status private by default for new properties', async () => {
    const user = userEvent.setup();
    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/Property Title/i), 'Marina Luxury View');
    await user.type(screen.getByLabelText(/Description/i), 'Exclusive high floor duplex');
    await user.selectOptions(screen.getByLabelText(/Locality/i), 'Dubai Marina');
    await user.selectOptions(screen.getByLabelText(/Property Type/i), '2bhk');
    await user.selectOptions(screen.getByLabelText(/Handover Status/i), 'ready');
    await user.type(screen.getByLabelText(/Handover Date/i), 'Ready');
    await user.type(screen.getByLabelText(/Price \(AED\)/i), '2500000');
    await user.type(screen.getByLabelText(/Developer Name/i), 'Emaar');
    await user.type(screen.getByLabelText(/Bedrooms/i), '2');
    await user.type(screen.getByLabelText(/Bathrooms/i), '2');
    await user.type(screen.getByLabelText(/Area \(sqft\)/i), '1300');

    const submitBtn = screen.getByRole('button', { name: /create property|save property/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.title).toBe('Marina Luxury View');
      expect(submittedData.price_aed).toBe(2500000);
      expect(submittedData.status).toBe('private');
      expect(submittedData.locality).toBe('Dubai Marina');
    });
  });

  it('pre-populates initialData for editing an existing property', () => {
    const initialData: Partial<Property> = {
      id: 'prop-edit-1',
      title: 'Existing Villa',
      description: 'Luxury villa in Palm Jumeirah',
      locality: 'Palm Jumeirah',
      property_type: 'villa',
      handover_status: 'ready',
      handover_date: 'Ready',
      price_aed: 15000000,
      developer_name: 'Nakheel',
      bedrooms: 5,
      bathrooms: 6,
      area_sqft: 7000,
      latitude: 25.1124,
      longitude: 55.1390,
      photos: ['https://cdn.supabase.co/villa.webp'],
      brochure_file_name: 'palm_villa.pdf',
      brochure_onedrive_url: 'https://onedrive.live.com/embed?resid=VILLA123',
      status: 'global',
    };

    render(<PropertyForm initialData={initialData} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/Property Title/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Existing Villa');
    expect(screen.getByText('palm_villa.pdf')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.supabase.co/villa.webp');
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit button and guards submission while brochure upload is in-flight', async () => {
    let resolveUpload: (val: any) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    (storageService.uploadBrochureToOneDrive as any).mockReturnValue(uploadPromise);

    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const pdfInput = screen.getByTestId('brochure-file-input');
    const mockFile = new File(['%PDF-1.4'], 'brochure.pdf', { type: 'application/pdf' });

    fireEvent.change(pdfInput, { target: { files: [mockFile] } });

    const submitBtn = screen.getByRole('button', { name: /uploading brochure/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.submit(submitBtn.closest('form')!);
    expect(mockOnSubmit).not.toHaveBeenCalled();

    resolveUpload!({
      fileName: 'brochure.pdf',
      webUrl: 'https://1drv.ms/b/mock',
      embedUrl: 'https://onedrive.live.com/embed?resid=MOCK',
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create property/i })).not.toBeDisabled();
    });
  });

  it('disables submit button and guards submission while photo upload is in-flight', async () => {
    let resolvePhoto: (val: any) => void;
    const photoPromise = new Promise((resolve) => {
      resolvePhoto = resolve;
    });
    (storageService.compressAndUploadPhoto as any).mockReturnValue(photoPromise);

    render(<PropertyForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const photoInput = screen.getByTestId('photos-file-input');
    const mockFile = new File(['image'], 'unit.jpg', { type: 'image/jpeg' });

    fireEvent.change(photoInput, { target: { files: [mockFile] } });

    const submitBtn = screen.getByRole('button', { name: /uploading photos/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.submit(submitBtn.closest('form')!);
    expect(mockOnSubmit).not.toHaveBeenCalled();

    resolvePhoto!('https://cdn.supabase.co/unit.webp');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create property/i })).not.toBeDisabled();
    });
  });
});
