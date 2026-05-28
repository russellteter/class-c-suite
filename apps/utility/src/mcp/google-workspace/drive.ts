// apps/utility/src/mcp/google-workspace/drive.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md
//
// uploadFileToDrive: upload a local file to Google Drive (drive.file scope).
// Optionally places the file in a named folder. Returns a shareable URL.

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { getOAuth2Client } from './auth.js';

export interface UploadFileToDriveResult {
  /** Shareable URL to the uploaded file. */
  url: string;
  /** Google Drive file ID. */
  fileId: string;
}

/** Minimal contract for the Drive API client (injectable for testing). */
export interface DriveApiClient {
  files: {
    create(args: {
      requestBody: { name: string; parents?: string[]; mimeType?: string };
      media?: { mimeType: string; body: NodeJS.ReadableStream };
      fields?: string;
    }): Promise<{ data: { id?: string; webViewLink?: string } }>;
    list(args: {
      q: string;
      fields: string;
      pageSize: number;
    }): Promise<{ data: { files?: Array<{ id?: string }> } }>;
  };
  permissions: {
    create(args: {
      fileId: string;
      requestBody: { role: string; type: string };
    }): Promise<unknown>;
  };
}

/**
 * Upload a local file to Google Drive.
 * The MIME type is inferred from the file extension.
 * If `folder` is provided, the file is placed in a Drive folder with that name
 * (created if it does not exist under drive.file scope visibility).
 *
 * `_driveOverride` is for testing — inject a mock DriveApiClient.
 *
 * Requires scope: https://www.googleapis.com/auth/drive.file
 */
export async function uploadFileToDrive(
  vault: SafeStorageVault,
  filePath: string,
  folder?: string,
  _driveOverride?: DriveApiClient,
): Promise<UploadFileToDriveResult> {
  let drive: DriveApiClient;
  if (_driveOverride) {
    drive = _driveOverride;
  } else {
    const auth = await getOAuth2Client(vault);
    drive = google.drive({ version: 'v3', auth }) as unknown as DriveApiClient;
  }

  const fileName = path.basename(filePath);
  const mimeType = guessMimeType(fileName);
  const parents: string[] = [];

  if (folder) {
    // Find or create the folder under drive.file scope.
    const folderId = await findOrCreateFolder(drive, folder);
    parents.push(folderId);
  }

  const fileStream = fs.createReadStream(filePath);

  const uploaded = await drive.files.create({
    requestBody: {
      name: fileName,
      ...(parents.length > 0 ? { parents } : {}),
    },
    media: {
      mimeType,
      body: fileStream,
    },
    fields: 'id,webViewLink',
  });

  const fileId = uploaded.data.id;
  if (!fileId) {
    throw new Error('Google Drive API returned no file ID');
  }

  // Make the file readable by anyone with the link.
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const url =
    uploaded.data.webViewLink ??
    `https://drive.google.com/file/d/${fileId}/view`;

  return { url, fileId };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function findOrCreateFolder(
  drive: DriveApiClient,
  folderName: string,
): Promise<string> {
  // Search for an existing folder with this name that this app can see.
  const list = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  });

  const existing = list.data.files?.[0];
  if (existing?.id) return existing.id;

  // Create it.
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  const folderId = created.data.id;
  if (!folderId) throw new Error(`Failed to create Drive folder: ${folderName}`);
  return folderId;
}

function guessMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return map[ext] ?? 'application/octet-stream';
}
