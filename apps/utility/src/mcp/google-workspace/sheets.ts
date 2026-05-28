// apps/utility/src/mcp/google-workspace/sheets.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md
//
// createSheet: create a Google Sheet with a title + 2-D array of rows.
// First row is treated as headers. Values are written to Sheet1 starting at A1.

import { google } from 'googleapis';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { getOAuth2Client } from './auth.js';

export interface CreateSheetResult {
  /** Shareable URL to the created Google Sheet. */
  url: string;
  /** Google Sheets spreadsheet ID. */
  spreadsheetId: string;
}

/** Minimal contract for the Sheets API client (injectable for testing). */
export interface SheetsApiClient {
  spreadsheets: {
    create(args: { requestBody: object }): Promise<{ data: { spreadsheetId?: string } }>;
    values: {
      update(args: {
        spreadsheetId: string;
        range: string;
        valueInputOption: string;
        requestBody: { values: string[][] };
      }): Promise<unknown>;
    };
  };
}

/**
 * Create a Google Sheet with the given title and 2-D row data.
 * rows2d[0] is the header row. Each element is serialised with String() before
 * writing so numbers, dates, and strings all round-trip cleanly.
 *
 * `_sheetsOverride` is for testing — inject a mock SheetsApiClient.
 *
 * Requires scope: https://www.googleapis.com/auth/spreadsheets
 */
export async function createSheet(
  vault: SafeStorageVault,
  title: string,
  rows2d: unknown[][],
  _sheetsOverride?: SheetsApiClient,
): Promise<CreateSheetResult> {
  let sheets: SheetsApiClient;
  if (_sheetsOverride) {
    sheets = _sheetsOverride;
  } else {
    const auth = await getOAuth2Client(vault);
    sheets = google.sheets({ version: 'v4', auth }) as unknown as SheetsApiClient;
  }

  // Create the spreadsheet with the given title.
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [{ properties: { title: 'Sheet1' } }],
    },
  });

  const spreadsheetId = created.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Google Sheets API returned no spreadsheetId');
  }

  // Write the row data if present.
  if (rows2d.length > 0) {
    const values = rows2d.map((row) => row.map(String));
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { url, spreadsheetId };
}
