/**
 * importService.ts
 *
 * Browser-only parsing of Excel (.xlsx / .xls / .csv) and PDF files for
 * bulk property import in Realtor Buddy.
 *
 * Excel: parsed using the `xlsx` npm library (SheetJS Community Edition).
 * PDF: extracted using the Gemini REST API (gemini-2.0-flash) via fetch.
 */

import * as XLSX from 'xlsx';
import type { Property, PropertyType, HandoverStatus } from '../types';
import type { GeocodingResult } from './geocodingService';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ImportedRow {
  project: string;
  building: string;
  unitNo: string;
  unitView: string;
  /** Raw bedroom string as it appears in the file, e.g. "Studio", "1 Bedroom" */
  bedrooms: string;
  totalAreaSqft: number;
  priceAed: number;
  currency: string;
  /** false when the row is missing unitNo or a valid price */
  valid: boolean;
  /** Human-readable warning, e.g. "Non-AED currency" */
  warning?: string;
  /** Resolved OpenStreetMap / Google geocoding result */
  location?: GeocodingResult | null;
  /** Status of map location lookup */
  locationStatus?: 'found' | 'not_found' | 'pending';
}

export interface ParseResult {
  rows: ImportedRow[];
  /** Number of rows that were completely blank and silently skipped */
  skippedCount: number;
  /** Set when a fatal parsing error occurred */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive substring column header matcher.
 * Returns the index of the first header that contains `needle`, or -1.
 */
function findColIndex(headers: string[], needle: string): number {
  const lc = needle.toLowerCase();
  return headers.findIndex((h) => h.toLowerCase().includes(lc));
}

/**
 * Reads a cell value as a string; returns '' for null/undefined.
 */
function cellStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Reads a cell value as a non-negative number; returns 0 for non-numeric.
 */
function cellNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : Math.abs(n);
}

/**
 * Validates a parsed row and attaches `valid` / `warning` flags.
 */
function validateRow(row: Omit<ImportedRow, 'valid' | 'warning'>): ImportedRow {
  const warning =
    row.currency && row.currency.toUpperCase() !== 'AED'
      ? `Non-AED currency: ${row.currency}`
      : undefined;

  const valid = row.unitNo.length > 0 && row.priceAed > 0;

  return { ...row, valid, warning };
}

/**
 * Converts a flat object (from SheetJS or Gemini) with string keys into an ImportedRow.
 * The header→field mapping is driven by the column index arrays discovered from the header row.
 */
function objectToRow(
  rawObj: Record<string, unknown>,
  colMap: Record<string, number>,
  headers: string[]
): ImportedRow | null {
  // Check if the entire row is blank
  const values = headers.map((h) => rawObj[h]);
  const allBlank = values.every((v) => v === null || v === undefined || cellStr(v) === '');
  if (allBlank) return null;

  const get = (field: keyof typeof colMap) => {
    const idx = colMap[field];
    if (idx === -1) return '';
    return rawObj[headers[idx]] ?? '';
  };

  const project = cellStr(get('project'));
  const building = cellStr(get('building'));
  const unitNo = cellStr(get('unitNo'));
  const unitView = cellStr(get('unitView'));
  const bedrooms = cellStr(get('bedrooms'));
  const totalAreaSqft = cellNum(get('totalAreaSqft'));
  const priceAed = cellNum(get('priceAed'));
  const currency = cellStr(get('currency'));

  return validateRow({ project, building, unitNo, unitView, bedrooms, totalAreaSqft, priceAed, currency });
}

/**
 * Discover column index map from a header row array.
 */
function buildColMap(headers: string[]): Record<string, number> {
  return {
    project: findColIndex(headers, 'project'),
    building: findColIndex(headers, 'building'),
    unitNo: findColIndex(headers, 'unit no'),
    unitView: findColIndex(headers, 'view'),
    bedrooms: findColIndex(headers, 'bedroom'),
    // Prefer "Total Area" SQFT; avoid matching "Unit Area" first
    totalAreaSqft: (() => {
      const totalIdx = headers.findIndex((h) =>
        h.toLowerCase().includes('total area') && h.toLowerCase().includes('sqft')
      );
      if (totalIdx !== -1) return totalIdx;
      return findColIndex(headers, 'sqft');
    })(),
    priceAed: findColIndex(headers, 'price'),
    currency: findColIndex(headers, 'currency'),
  };
}

// ---------------------------------------------------------------------------
// Excel / CSV parsing
// ---------------------------------------------------------------------------

/**
 * Parses an .xlsx, .xls, or .csv File object and returns structured rows.
 * Runs entirely in the browser without any network calls.
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer', cellText: false, cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rows: [], skippedCount: 0, errorMessage: 'The workbook has no sheets.' };
    }

    const sheet = workbook.Sheets[firstSheetName];
    // header: 1 returns an array-of-arrays; we use raw: false to get formatted strings
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

    if (rawData.length < 2) {
      return { rows: [], skippedCount: 0, errorMessage: 'The sheet appears to be empty or has no data rows.' };
    }

    const headers = (rawData[0] as string[]).map((h) => cellStr(h));
    const colMap = buildColMap(headers);

    const rows: ImportedRow[] = [];
    let skippedCount = 0;

    for (let i = 1; i < rawData.length; i++) {
      const rawRow = rawData[i] as unknown[];
      // Convert array to header-keyed object for objectToRow
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => { obj[h] = rawRow[idx]; });

      const parsed = objectToRow(obj, colMap, headers);
      if (parsed === null) {
        skippedCount++;
      } else {
        rows.push(parsed);
      }
    }

    return { rows, skippedCount };
  } catch (err) {
    return {
      rows: [],
      skippedCount: 0,
      errorMessage: `Failed to parse the file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// PDF parsing via Gemini API
// ---------------------------------------------------------------------------

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const PDF_EXTRACTION_PROMPT = `Extract all property or unit listings from this PDF document as a JSON array.

Each object in the array must have EXACTLY these keys:
- "project": string (developer or project name)
- "building": string (building or tower name, empty string if not present)
- "unitNo": string (unit number or identifier)
- "unitView": string (view description, empty string if not present)
- "bedrooms": string ("Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms", "5+ Bedrooms")
- "totalAreaSqft": number (total area in square feet, 0 if not available)
- "priceAed": number (price in AED, 0 if not available)
- "currency": string (currency code, default "AED")

Rules:
- Return ONLY a valid JSON array. No markdown fences, no explanation, no extra text.
- Use empty string "" for missing text values.
- Use 0 for missing numeric values.
- If the PDF contains no property listings, return an empty array: []
- Include every listing found, even if some fields are missing.`;

/**
 * Sends a PDF to the Gemini API and extracts property rows from its content.
 * The API key is provided at runtime by the user and never stored.
 */
export async function parsePdfWithGemini(file: File, apiKey: string): Promise<ParseResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { rows: [], skippedCount: 0, errorMessage: 'Please enter a Gemini API key to parse PDF files.' };
  }

  try {
    // Convert PDF to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64Data,
              },
            },
            { text: PDF_EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    };

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey.trim())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let msg = `Gemini API error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error?.message) msg = `Gemini API: ${errorJson.error.message}`;
      } catch {
        // use default message
      }
      return { rows: [], skippedCount: 0, errorMessage: msg };
    }

    const responseJson = await response.json();
    const rawText: string =
      responseJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip potential markdown code fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsedArray: Record<string, unknown>[];
    try {
      parsedArray = JSON.parse(cleaned);
      if (!Array.isArray(parsedArray)) throw new Error('Response is not a JSON array');
    } catch {
      return {
        rows: [],
        skippedCount: 0,
        errorMessage: `Gemini returned unexpected output. Raw: ${rawText.slice(0, 200)}`,
      };
    }

    const rows: ImportedRow[] = [];
    let skippedCount = 0;

    for (const item of parsedArray) {
      const project = cellStr(item['project']);
      const building = cellStr(item['building']);
      const unitNo = cellStr(item['unitNo']);
      const unitView = cellStr(item['unitView']);
      const bedrooms = cellStr(item['bedrooms']);
      const totalAreaSqft = cellNum(item['totalAreaSqft']);
      const priceAed = cellNum(item['priceAed']);
      const currency = cellStr(item['currency']) || 'AED';

      const allBlank = !project && !unitNo && priceAed === 0 && totalAreaSqft === 0;
      if (allBlank) {
        skippedCount++;
        continue;
      }

      rows.push(validateRow({ project, building, unitNo, unitView, bedrooms, totalAreaSqft, priceAed, currency }));
    }

    return { rows, skippedCount };
  } catch (err) {
    return {
      rows: [],
      skippedCount: 0,
      errorMessage: `Unexpected error during PDF parsing: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Row → Property conversion
// ---------------------------------------------------------------------------

/**
 * Converts a parsed ImportedRow into a Partial<Property> suitable for
 * the existing `insertLiveProperty` / `handleCreateProperty` flow.
 */
export function importedRowToProperty(row: ImportedRow, createdBy: string): Partial<Property> {
  // Map bedroom string to a count
  const bedroomsLower = row.bedrooms.toLowerCase().trim();
  let bedroomCount: number;
  if (bedroomsLower === 'studio' || bedroomsLower === '0') {
    bedroomCount = 0;
  } else {
    // Extract leading digit(s), e.g. "1 Bedroom" → 1, "4+ Bedrooms" → 4
    const match = bedroomsLower.match(/^(\d+)/);
    bedroomCount = match ? parseInt(match[1], 10) : 1;
  }

  // Map bedroom count to PropertyType
  let propertyType: PropertyType;
  if (bedroomCount === 0) {
    propertyType = 'studio';
  } else if (bedroomCount === 1) {
    propertyType = '1bhk';
  } else if (bedroomCount === 2) {
    propertyType = '2bhk';
  } else if (bedroomCount === 3) {
    propertyType = '3bhk';
  } else {
    propertyType = '4bhk_plus';
  }

  const title = [row.project, row.unitNo].filter(Boolean).join(' – ') || 'Imported Property';
  const descriptionParts: string[] = [];
  if (row.building && row.building !== row.project) {
    descriptionParts.push(`Building: ${row.building}`);
  }
  if (row.unitView) {
    descriptionParts.push(`View: ${row.unitView}`);
  }
  const description = descriptionParts.join(' | ');

  const resolvedLat =
    row.location && typeof row.location.latitude === 'number'
      ? row.location.latitude
      : 25.2048;
  const resolvedLng =
    row.location && typeof row.location.longitude === 'number'
      ? row.location.longitude
      : 55.2708;
  const resolvedLocality =
    row.location && row.location.locality ? row.location.locality : 'Dubai';

  return {
    title,
    description,
    property_type: propertyType,
    locality: resolvedLocality,
    sub_community: row.building || undefined,
    handover_status: 'under_construction' as HandoverStatus,
    handover_date: 'TBD',
    price_aed: row.priceAed,
    developer_name: row.project || 'Unknown Developer',
    area_sqft: row.totalAreaSqft,
    bedrooms: bedroomCount,
    bathrooms: Math.max(1, bedroomCount),
    latitude: resolvedLat,
    longitude: resolvedLng,
    photos: [],
    status: 'global',
    created_by: createdBy,
  };
}
