// apps/utility/src/mcp/google-workspace/index.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md
//
// Public surface for the Google Workspace wrapper module.

export { createDoc } from './docs.js';
export type { CreateDocResult } from './docs.js';

export { createSheet } from './sheets.js';
export type { CreateSheetResult } from './sheets.js';

export { createSlides } from './slides.js';
export type { CreateSlidesResult, SlideSpec } from './slides.js';

export { uploadFileToDrive } from './drive.js';
export type { UploadFileToDriveResult } from './drive.js';

export { getOAuth2Client, GoogleWorkspaceAuthError } from './auth.js';
