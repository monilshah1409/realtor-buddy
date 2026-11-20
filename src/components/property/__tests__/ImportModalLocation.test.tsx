import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportModal } from '../ImportModal';
import * as importService from '../../services/importService';
import * as geocodingService from '../../services/geocodingService';

describe('ImportModal Location Geocoding & Notification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('performs geocoding on import and renders verified vs unmapped badges and admin notice', async () => {
    const mockRows: importService.ImportedRow[] = [
      {
        project: 'Burj Crown',
        building: 'Tower A',
        unitNo: '101',
        unitView: 'Burj View',
        bedrooms: '2 Bedrooms',
        totalAreaSqft: 1000,
        priceAed: 2200000,
        currency: 'AED',
        valid: true,
      },
      {
        project: 'Unknown Ghost Project',
        building: 'Ghost Tower',
        unitNo: '999',
        unitView: '',
        bedrooms: '1 Bedroom',
        totalAreaSqft: 700,
        priceAed: 1200000,
        currency: 'AED',
        valid: true,
      },
    ];

    vi.spyOn(importService, 'parseExcelFile').mockResolvedValue({
      rows: mockRows,
      skippedCount: 0,
    });

    const locationMap = new Map<string, geocodingService.GeocodingResult | null>();
    locationMap.set(
      geocodingService.buildSearchQuery('Burj Crown', 'Tower A'),
      {
        latitude: 25.1972,
        longitude: 55.2744,
        displayName: 'Burj Crown, Downtown Dubai',
        locality: 'Downtown Dubai',
        found: true,
      }
    );
    locationMap.set(
      geocodingService.buildSearchQuery('Unknown Ghost Project', 'Ghost Tower'),
      null
    );

    vi.spyOn(geocodingService, 'batchGeocodeRows').mockResolvedValue(locationMap);

    render(<ImportModal onImport={vi.fn()} onCancel={vi.fn()} />);

    // Upload a mock file
    const file = new File(['mock content'], 'properties.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const dropzoneInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(dropzoneInput, { target: { files: [file] } });

    // Click Parse File button
    const parseBtn = screen.getByRole('button', { name: /parse file/i });
    fireEvent.click(parseBtn);

    // Verify map location column is rendered
    await waitFor(() => {
      expect(screen.getByText(/Map Location/i)).toBeTruthy();
    });

    // Verify verified badge for Burj Crown
    expect(screen.getByText('Downtown Dubai')).toBeTruthy();

    // Verify unmapped badge for Unknown Ghost Project
    expect(screen.getByText('Not on Maps')).toBeTruthy();

    // Verify admin alert notification banner is displayed
    expect(screen.getByText(/1 property name is not registered on Google Maps/i)).toBeTruthy();

    // Verify summary pills
    expect(screen.getByText(/1 on map/i)).toBeTruthy();
    expect(screen.getByText(/1 not on map/i)).toBeTruthy();

    // Test "Review Unmapped Only" filter button
    const filterBtn = screen.getByRole('button', { name: /review unmapped only/i });
    fireEvent.click(filterBtn);

    // After filtering, Burj Crown row should be filtered out
    expect(screen.queryByText('Downtown Dubai')).toBeNull();
    // Ghost project should still be visible
    expect(screen.getByText('Unknown Ghost Project')).toBeTruthy();
  });
});
