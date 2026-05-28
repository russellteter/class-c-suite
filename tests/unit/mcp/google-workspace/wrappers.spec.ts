// tests/unit/mcp/google-workspace/wrappers.spec.ts
// Unit tests for Google Workspace wrappers: createDoc, createSheet, createSlides,
// uploadFileToDrive.
//
// Strategy: each wrapper accepts an optional injectable API client (_*Override param).
// Tests pass a vi.fn()-based mock client directly. No vi.mock() of googleapis needed.
// The auth module is NOT called when an override is provided.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';
import type { DocsApiClient } from '../../../../apps/utility/src/mcp/google-workspace/docs.js';
import type { SheetsApiClient } from '../../../../apps/utility/src/mcp/google-workspace/sheets.js';
import type { SlidesApiClient } from '../../../../apps/utility/src/mcp/google-workspace/slides.js';
import type { DriveApiClient } from '../../../../apps/utility/src/mcp/google-workspace/drive.js';
import {
  createDoc,
  GoogleWorkspaceAuthError,
} from '../../../../apps/utility/src/mcp/google-workspace/docs.js';
import { createSheet } from '../../../../apps/utility/src/mcp/google-workspace/sheets.js';
import { createSlides } from '../../../../apps/utility/src/mcp/google-workspace/slides.js';
import { uploadFileToDrive } from '../../../../apps/utility/src/mcp/google-workspace/drive.js';

// ── Fake vault helper ────────────────────────────────────────────────────────

function makeVault(): SafeStorageVault {
  return {
    hasValidCredential: vi.fn().mockResolvedValue(true),
    loadCredential: vi.fn().mockResolvedValue({
      plaintext: 'fake-refresh-token',
      type: 'oauth_refresh_token' as const,
      metadata: {},
    }),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

// ── Mock API client factories ─────────────────────────────────────────────────

function makeDocsClient(documentId = 'doc-abc-123'): DocsApiClient {
  return {
    documents: {
      create: vi.fn().mockResolvedValue({ data: { documentId } }),
      batchUpdate: vi.fn().mockResolvedValue({ data: {} }),
    },
  };
}

function makeSheetsClient(spreadsheetId = 'sheet-xyz-789'): SheetsApiClient {
  return {
    spreadsheets: {
      create: vi.fn().mockResolvedValue({ data: { spreadsheetId } }),
      values: {
        update: vi.fn().mockResolvedValue({ data: {} }),
      },
    },
  };
}

function makeSlidesClient(presentationId = 'slides-prs-001'): SlidesApiClient {
  return {
    presentations: {
      create: vi.fn().mockResolvedValue({ data: { presentationId } }),
      batchUpdate: vi.fn().mockResolvedValue({ data: {} }),
    },
  };
}

function makeDriveClient(
  opts: { fileId?: string; webViewLink?: string; folderId?: string } = {}
): DriveApiClient {
  const fileId = opts.fileId ?? 'drive-file-abc';
  const webViewLink =
    opts.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;

  const filesCreate = vi.fn().mockResolvedValue({ data: { id: fileId, webViewLink } });
  const filesList = vi.fn().mockResolvedValue({ data: { files: [] } });
  const permissionsCreate = vi.fn().mockResolvedValue({ data: {} });

  return {
    files: { create: filesCreate, list: filesList },
    permissions: { create: permissionsCreate },
  };
}

beforeEach(() => {
  process.env['GMAIL_CLIENT_ID'] = 'test-client-id';
  process.env['GMAIL_CLIENT_SECRET'] = 'test-client-secret';
});

// ── createDoc ─────────────────────────────────────────────────────────────────

describe('createDoc', () => {
  it('creates a Google Doc and returns url + documentId', async () => {
    const mockDocs = makeDocsClient('doc-abc-123');

    const result = await createDoc(
      makeVault(),
      'Test Doc',
      '# Hello\n\nBody text.',
      mockDocs,
    );

    expect(result.documentId).toBe('doc-abc-123');
    expect(result.url).toBe('https://docs.google.com/document/d/doc-abc-123/edit');
    expect(mockDocs.documents.create).toHaveBeenCalledWith({
      requestBody: { title: 'Test Doc' },
    });
    expect(mockDocs.documents.batchUpdate).toHaveBeenCalledOnce();
  });

  it('skips batchUpdate when body is empty', async () => {
    const mockDocs = makeDocsClient('doc-empty');

    await createDoc(makeVault(), 'Empty Doc', '   ', mockDocs);

    expect(mockDocs.documents.batchUpdate).not.toHaveBeenCalled();
  });

  it('GoogleWorkspaceAuthError is an Error subclass', () => {
    const err = new GoogleWorkspaceAuthError('missing creds');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('GoogleWorkspaceAuthError');
    expect(err.message).toBe('missing creds');
  });
});

// ── createSheet ───────────────────────────────────────────────────────────────

describe('createSheet', () => {
  it('creates a Google Sheet and returns url + spreadsheetId', async () => {
    const mockSheets = makeSheetsClient('sheet-xyz-789');

    const rows: unknown[][] = [
      ['Rep', 'Territory', 'Quota'],
      ['Alice', 'West', 500_000],
      ['Bob', 'East', 450_000],
    ];

    const result = await createSheet(makeVault(), 'Rep Allocation', rows, mockSheets);

    expect(result.spreadsheetId).toBe('sheet-xyz-789');
    expect(result.url).toBe(
      'https://docs.google.com/spreadsheets/d/sheet-xyz-789/edit',
    );
    expect(mockSheets.spreadsheets.create).toHaveBeenCalledOnce();
    expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'sheet-xyz-789',
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
      }),
    );
  });

  it('skips values.update when rows2d is empty', async () => {
    const mockSheets = makeSheetsClient('sheet-empty');

    await createSheet(makeVault(), 'Empty Sheet', [], mockSheets);

    expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
  });
});

// ── createSlides ──────────────────────────────────────────────────────────────

describe('createSlides', () => {
  it('creates a Google Slides deck and returns url + presentationId', async () => {
    const mockSlides = makeSlidesClient('slides-prs-001');

    const specs = [
      { title: 'Q3 Board Update', body: 'Agenda and key themes' },
      { title: 'Financial Highlights', body: 'Revenue and cash position' },
    ];

    const result = await createSlides(makeVault(), 'Q3 Board Deck', specs, mockSlides);

    expect(result.presentationId).toBe('slides-prs-001');
    expect(result.url).toBe(
      'https://docs.google.com/presentation/d/slides-prs-001/edit',
    );
    expect(mockSlides.presentations.create).toHaveBeenCalledOnce();
    expect(mockSlides.presentations.batchUpdate).toHaveBeenCalledOnce();
  });

  it('skips batchUpdate when slideSpecs is empty', async () => {
    const mockSlides = makeSlidesClient('slides-blank');

    await createSlides(makeVault(), 'Blank Deck', [], mockSlides);

    expect(mockSlides.presentations.batchUpdate).not.toHaveBeenCalled();
  });
});

// ── uploadFileToDrive ────────────────────────────────────────────────────────

describe('uploadFileToDrive', () => {
  it('uploads a file and returns url + fileId', async () => {
    const mockDrive = makeDriveClient({ fileId: 'drive-file-abc' });

    const result = await uploadFileToDrive(
      makeVault(),
      __filename,
      undefined,
      mockDrive,
    );

    expect(result.fileId).toBe('drive-file-abc');
    expect(result.url).toBe('https://drive.google.com/file/d/drive-file-abc/view');
    expect(mockDrive.files.create).toHaveBeenCalledOnce();
    expect(mockDrive.permissions.create).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: 'drive-file-abc' }),
    );
  });

  it('creates a folder and uploads into it when folder param provided', async () => {
    const filesCreate = vi.fn()
      .mockResolvedValueOnce({ data: { id: 'folder-id-001' } })      // folder creation
      .mockResolvedValueOnce({                                          // file upload
        data: {
          id: 'file-in-folder',
          webViewLink: 'https://drive.google.com/file/d/file-in-folder/view',
        },
      });
    const filesList = vi.fn().mockResolvedValue({ data: { files: [] } });
    const permissionsCreate = vi.fn().mockResolvedValue({ data: {} });

    const mockDrive: DriveApiClient = {
      files: { create: filesCreate, list: filesList },
      permissions: { create: permissionsCreate },
    };

    const result = await uploadFileToDrive(
      makeVault(),
      __filename,
      'C-Suite Exports',
      mockDrive,
    );

    expect(result.fileId).toBe('file-in-folder');
    expect(filesList).toHaveBeenCalledOnce();
    expect(filesCreate).toHaveBeenCalledTimes(2);
  });
});
