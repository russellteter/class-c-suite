// apps/utility/src/mcp/google-workspace/docs.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md
//
// createDoc: create a Google Doc with a title + markdown body text.
// The markdown body is inserted as plain text (Google Docs API does not
// natively render Markdown; body is stored verbatim for now — rich
// conversion is a future enhancement).

import { google } from 'googleapis';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { getOAuth2Client, GoogleWorkspaceAuthError } from './auth.js';

export { GoogleWorkspaceAuthError };

export interface CreateDocResult {
  /** Shareable URL to the created Google Doc. */
  url: string;
  /** Google Doc document ID. */
  documentId: string;
}

/** Minimal contract for the Docs API client (injectable for testing). */
export interface DocsApiClient {
  documents: {
    create(args: { requestBody: { title: string } }): Promise<{ data: { documentId?: string } }>;
    batchUpdate(args: { documentId: string; requestBody: { requests: object[] } }): Promise<unknown>;
  };
}

/**
 * Create a Google Doc with the given title and markdown body.
 * The body is inserted as plain text at the top of the document.
 * Returns a shareable URL.
 *
 * `_docsOverride` is for testing — inject a mock DocsApiClient.
 *
 * Requires scope: https://www.googleapis.com/auth/documents
 */
export async function createDoc(
  vault: SafeStorageVault,
  title: string,
  markdownBody: string,
  _docsOverride?: DocsApiClient,
): Promise<CreateDocResult> {
  let docs: DocsApiClient;
  if (_docsOverride) {
    docs = _docsOverride;
  } else {
    const auth = await getOAuth2Client(vault);
    docs = google.docs({ version: 'v1', auth }) as unknown as DocsApiClient;
  }

  // Create the document.
  const created = await docs.documents.create({
    requestBody: { title },
  });

  const documentId = created.data.documentId;
  if (!documentId) {
    throw new GoogleWorkspaceAuthError('Google Docs API returned no documentId');
  }

  // Insert the markdown body as plain text at index 1 (after the title).
  if (markdownBody.trim().length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: markdownBody,
            },
          },
        ],
      },
    });
  }

  const url = `https://docs.google.com/document/d/${documentId}/edit`;
  return { url, documentId };
}
