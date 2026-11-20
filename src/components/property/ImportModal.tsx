/**
 * ImportModal.tsx
 *
 * Provides a drag-and-drop import UI for .xlsx/.xls/.csv and .pdf files.
 * Parses the file using importService, shows a preview table with row
 * validation badges, and bulk-imports the selected rows via the `onImport`
 * prop (which calls the existing property creation flow).
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Key,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';
import type { Property } from '../../types';
import {
  parseExcelFile,
  parsePdfWithGemini,
  importedRowToProperty,
  type ImportedRow,
  type ParseResult,
} from '../../services/importService';
import { batchGeocodeRows, buildSearchQuery } from '../../services/geocodingService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportModalProps {
  /** Called once per property. ImportModal loops through all selected rows. */
  onImport: (properties: Partial<Property>[]) => Promise<void>;
  /** Called when import finishes or the user cancels */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(aed: number): string {
  return aed.toLocaleString('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 });
}

function formatArea(sqft: number): string {
  return sqft > 0 ? `${sqft.toLocaleString()} sqft` : '—';
}

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv,.pdf';
const BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [checkedRows, setCheckedRows] = useState<boolean[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ completed: 0, total: 0 });
  const [filterUnmappedOnly, setFilterUnmappedOnly] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // File selection
  // -------------------------------------------------------------------------

  const handleFile = useCallback((selected: File) => {
    setFile(selected);
    setParseResult(null);
    setCheckedRows([]);
    setImportDone(false);
    setImportProgress(0);
    setIsGeocoding(false);
    setGeocodingProgress({ completed: 0, total: 0 });
    setFilterUnmappedOnly(false);
  }, []);

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const isPdf = file?.name.toLowerCase().endsWith('.pdf') ?? false;

  // -------------------------------------------------------------------------
  // Parsing
  // -------------------------------------------------------------------------

  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true);
    setParseResult(null);
    setFilterUnmappedOnly(false);

    let result: ParseResult;
    if (isPdf) {
      result = await parsePdfWithGemini(file, geminiApiKey);
    } else {
      result = await parseExcelFile(file);
    }

    // Default: check all valid rows (valid=true, no currency warning blocking)
    setCheckedRows(result.rows.map((r) => r.valid));
    setIsParsing(false);

    // If rows exist, automatically resolve locations via OpenStreetMap Nominatim
    if (result.rows.length > 0) {
      // Show intermediate state with pending locations
      const initialPendingRows: ImportedRow[] = result.rows.map((r) => ({
        ...r,
        locationStatus: 'pending',
      }));
      setParseResult({ ...result, rows: initialPendingRows });

      setIsGeocoding(true);
      setGeocodingProgress({ completed: 0, total: result.rows.length });

      const locationMap = await batchGeocodeRows(result.rows, (done, total) => {
        setGeocodingProgress({ completed: done, total });
      });

      const enrichedRows: ImportedRow[] = result.rows.map((r) => {
        const query = buildSearchQuery(r.project, r.building);
        const loc = locationMap.get(query);
        return {
          ...r,
          location: loc || null,
          locationStatus: loc && loc.found ? ('found' as const) : ('not_found' as const),
        };
      });

      setParseResult({ ...result, rows: enrichedRows });
      setIsGeocoding(false);
    } else {
      setParseResult(result);
    }
  };

  // -------------------------------------------------------------------------
  // Row selection
  // -------------------------------------------------------------------------

  const toggleRow = (idx: number) => {
    if (!parseResult?.rows[idx].valid) return; // cannot check invalid rows
    setCheckedRows((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const toggleAll = () => {
    if (!parseResult) return;
    const validRows = parseResult.rows.filter((r) => r.valid);
    const allChecked = checkedRows.filter((c, i) => parseResult.rows[i].valid).every(Boolean);
    setCheckedRows(parseResult.rows.map((r) => (r.valid ? !allChecked : false)));
  };

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  const selectedRows = parseResult?.rows.filter((_, i) => checkedRows[i]) ?? [];

  const handleImport = async () => {
    if (selectedRows.length === 0 || !parseResult) return;
    setIsImporting(true);
    setImportProgress(0);

    let done = 0;
    for (let i = 0; i < selectedRows.length; i += BATCH_SIZE) {
      const batch = selectedRows.slice(i, i + BATCH_SIZE);
      const props = batch.map((row) => importedRowToProperty(row, ''));
      await onImport(props);
      done += batch.length;
      setImportProgress(Math.round((done / selectedRows.length) * 100));
      // Yield to browser between batches
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    setImportedCount(selectedRows.length);
    setIsImporting(false);
    setImportDone(true);
  };

  // -------------------------------------------------------------------------
  // Row status helpers
  // -------------------------------------------------------------------------

  const rowStatusBadge = (row: ImportedRow) => {
    if (!row.valid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Invalid
        </span>
      );
    }
    if (row.warning) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <AlertTriangle className="w-3 h-3" />
          {row.warning}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />
        Ready
      </span>
    );
  };

  const validCount = parseResult?.rows.filter((r) => r.valid).length ?? 0;
  const warningCount = parseResult?.rows.filter((r) => r.valid && r.warning).length ?? 0;
  const invalidCount = parseResult?.rows.filter((r) => !r.valid).length ?? 0;
  const checkedCount = checkedRows.filter(Boolean).length;

  const mappedCount = parseResult?.rows.filter((r) => r.locationStatus === 'found').length ?? 0;
  const unmappedCount = parseResult?.rows.filter((r) => r.locationStatus === 'not_found').length ?? 0;

  // Filter unmapped listings if toggled
  const filteredRows = parseResult
    ? filterUnmappedOnly
      ? parseResult.rows.filter((r) => r.locationStatus === 'not_found')
      : parseResult.rows
    : [];

  // Show up to 50 rows by default
  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, 50);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Step 1 – File selection                                             */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-amber-400 bg-amber-50'
            : file
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={onFileInputChange}
        />

        {file ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              {isPdf ? (
                <FileText className="w-8 h-8 text-red-500" />
              ) : (
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              )}
              <span className="text-lg font-semibold text-stone-800">{file.name}</span>
              <button
                type="button"
                className="ml-2 text-stone-400 hover:text-red-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setParseResult(null);
                }}
                title="Remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-stone-500">
              {(file.size / 1024).toFixed(1)} KB — {isPdf ? 'PDF document' : 'Spreadsheet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Upload className="w-12 h-12 text-stone-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-700">Drop your inventory file here</p>
              <p className="text-sm text-stone-500 mt-1">
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong>, and{' '}
                <strong>.pdf</strong>
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Download className="w-4 h-4" />
              Browse files
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 2 – Gemini API key (PDF only)                                  */}
      {/* ------------------------------------------------------------------ */}
      {file && isPdf && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Key className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Gemini API Key required for PDF parsing</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your key is used only for this import and is never stored.
                Get a free key at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-900"
                >
                  aistudio.google.com
                </a>
                .
              </p>
            </div>
          </div>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 pr-20 text-sm border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-600 hover:text-amber-800 font-medium"
              onClick={() => setShowApiKey((v) => !v)}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3 – Parse button                                               */}
      {/* ------------------------------------------------------------------ */}
      {file && !parseResult && !importDone && (
        <button
          type="button"
          onClick={handleParse}
          disabled={isParsing || (isPdf && !geminiApiKey.trim())}
          className="w-full py-3 bg-stone-800 text-white rounded-xl font-semibold hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isPdf ? 'Analysing PDF with Gemini…' : 'Parsing spreadsheet…'}
            </>
          ) : (
            <>
              {isPdf ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
              {isPdf ? 'Parse PDF with Gemini' : 'Parse Spreadsheet'}
            </>
          )}
        </button>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 4 – Parse error                                                */}
      {/* ------------------------------------------------------------------ */}
      {parseResult?.errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Parse Error</p>
            <p className="text-sm text-red-700 mt-1">{parseResult.errorMessage}</p>
            <button
              type="button"
              className="mt-2 text-sm underline text-red-600 hover:text-red-800"
              onClick={() => setParseResult(null)}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 5 – Preview table                                              */}
      {/* ------------------------------------------------------------------ */}
      {parseResult && !parseResult.errorMessage && parseResult.rows.length > 0 && !importDone && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm font-semibold text-stone-700">
              {parseResult.rows.length.toLocaleString()} rows found
            </span>
            {parseResult.skippedCount > 0 && (
              <span className="text-xs text-stone-500">{parseResult.skippedCount} blank rows skipped</span>
            )}
            <div className="flex gap-2 ml-auto flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" />
                {validCount} valid
              </span>
              {mappedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  {mappedCount} on map
                </span>
              )}
              {unmappedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  {unmappedCount} not on map
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="w-3 h-3" />
                  {warningCount} warnings
                </span>
              )}
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <XCircle className="w-3 h-3" />
                  {invalidCount} invalid
                </span>
              )}
            </div>
          </div>

          {/* Location lookup in progress */}
          {isGeocoding && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-4 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-sky-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-sky-900">
                  Searching property locations on map...
                </p>
                <p className="text-xs text-sky-700 mt-0.5">
                  Looking up GPS coordinates and area via OpenStreetMap / Google ({geocodingProgress.completed} of {geocodingProgress.total} unique developments resolved)
                </p>
              </div>
            </div>
          )}

          {/* Admin alert: Property names not registered on Google Maps */}
          {!isGeocoding && unmappedCount > 0 && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-rose-950">
                    {unmappedCount} {unmappedCount === 1 ? 'property name is' : 'property names are'} not registered on Google Maps
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-200 text-rose-900 uppercase tracking-wider">
                    Notice
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1">
                  These properties could not be found on Google Maps or OpenStreetMap. They will default to Dubai central coordinates unless verified or edited.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFilterUnmappedOnly((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border shadow-xs whitespace-nowrap ${
                  filterUnmappedOnly
                    ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                    : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
              >
                {filterUnmappedOnly ? 'Show All Rows' : 'Review Unmapped Only'}
              </button>
            </div>
          )}

          {/* Scrollable table */}
          <div className="rounded-xl border border-stone-200 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={checkedCount > 0 && checkedCount === validCount}
                        onChange={toggleAll}
                        className="rounded border-stone-400 text-amber-600 focus:ring-amber-400"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-stone-600 font-medium">Project</th>
                    <th className="px-3 py-2 text-left text-stone-600 font-medium">Unit No</th>
                    <th className="px-3 py-2 text-left text-stone-600 font-medium">Map Location</th>
                    <th className="px-3 py-2 text-left text-stone-600 font-medium">Beds</th>
                    <th className="px-3 py-2 text-left text-stone-600 font-medium">Area</th>
                    <th className="px-3 py-2 text-right text-stone-600 font-medium">Price</th>
                    <th className="px-3 py-2 text-center text-stone-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {visibleRows.map((row, rowIdx) => {
                    const originalIdx = parseResult.rows.indexOf(row);
                    const isChecked = originalIdx !== -1 ? checkedRows[originalIdx] : false;

                    return (
                      <tr
                        key={originalIdx !== -1 ? originalIdx : rowIdx}
                        className={`${
                          isChecked ? 'bg-white' : 'bg-stone-50'
                        } hover:bg-amber-50 transition-colors`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            onChange={() => originalIdx !== -1 && toggleRow(originalIdx)}
                            disabled={!row.valid}
                            className="rounded border-stone-400 text-amber-600 focus:ring-amber-400 disabled:opacity-40"
                          />
                        </td>
                        <td className="px-3 py-2 text-stone-800 font-medium max-w-[160px] truncate" title={row.project}>
                          {row.project || '—'}
                        </td>
                        <td className="px-3 py-2 text-stone-600 font-mono text-xs">{row.unitNo || '—'}</td>
                        <td className="px-3 py-2">
                          {row.locationStatus === 'found' && row.location ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"
                              title={`${row.location.displayName} (${row.location.latitude.toFixed(4)}, ${row.location.longitude.toFixed(4)})`}
                            >
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="max-w-[120px] truncate">{row.location.locality || 'Verified'}</span>
                            </span>
                          ) : row.locationStatus === 'not_found' ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"
                              title="This property name was not found on Google Maps or OpenStreetMap"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              Not on Maps
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500">
                              <Loader2 className="w-3 h-3 animate-spin text-stone-400 shrink-0" />
                              Checking…
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-stone-600">{row.bedrooms || '—'}</td>
                        <td className="px-3 py-2 text-stone-600">{formatArea(row.totalAreaSqft)}</td>
                        <td className="px-3 py-2 text-right text-stone-800 font-medium tabular-nums">
                          {row.priceAed > 0 ? formatPrice(row.priceAed) : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">{rowStatusBadge(row)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Show more / less */}
            {parseResult.rows.length > 50 && (
              <div className="bg-stone-50 border-t border-stone-200 px-4 py-2 flex justify-center">
                <button
                  type="button"
                  className="text-sm text-stone-600 hover:text-stone-800 flex items-center gap-1"
                  onClick={() => setShowAllRows((v) => !v)}
                >
                  {showAllRows ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show first 50 rows
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show all {parseResult.rows.length.toLocaleString()} rows
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Import button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={checkedCount === 0 || isImporting}
              className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing… {importProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import {checkedCount.toLocaleString()} Propert{checkedCount === 1 ? 'y' : 'ies'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isImporting}
              className="px-4 py-3 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Progress bar */}
          {isImporting && (
            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 6 – Empty parse result                                         */}
      {/* ------------------------------------------------------------------ */}
      {parseResult && !parseResult.errorMessage && parseResult.rows.length === 0 && !importDone && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center space-y-2">
          <FileSpreadsheet className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="text-sm font-medium text-stone-700">No property rows found</p>
          <p className="text-xs text-stone-500">
            {parseResult.skippedCount > 0
              ? `${parseResult.skippedCount} blank rows were skipped. Check that your file has data rows.`
              : 'The file could not be parsed into property listings. Try a different file.'}
          </p>
          <button
            type="button"
            className="text-sm underline text-stone-600 hover:text-stone-800"
            onClick={() => { setFile(null); setParseResult(null); }}
          >
            Try a different file
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 7 – Success state                                              */}
      {/* ------------------------------------------------------------------ */}
      {importDone && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <p className="text-lg font-semibold text-emerald-800">
            {importedCount.toLocaleString()} {importedCount === 1 ? 'property' : 'properties'} imported!
          </p>
          <p className="text-sm text-emerald-700">
            Your listings have been added and are now visible on the dashboard.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportModal;
