// apps/utility/src/mcp/google-workspace/slides.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md
//
// createSlides: create a Google Slides presentation with a title + slide specs.
// Each SlideSpec becomes one slide with a title text box and body text box.

import { google } from 'googleapis';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { getOAuth2Client } from './auth.js';

/** Spec for a single slide. */
export interface SlideSpec {
  /** Slide title text. */
  title: string;
  /** Slide body / speaker notes text. Empty string for title-only slides. */
  body?: string;
}

export interface CreateSlidesResult {
  /** Shareable URL to the created Google Slides presentation. */
  url: string;
  /** Google Slides presentation ID. */
  presentationId: string;
}

/** Minimal contract for the Slides API client (injectable for testing). */
export interface SlidesApiClient {
  presentations: {
    create(args: { requestBody: { title: string } }): Promise<{ data: { presentationId?: string } }>;
    batchUpdate(args: { presentationId: string; requestBody: { requests: object[] } }): Promise<unknown>;
  };
}

/**
 * Create a Google Slides presentation with the given title and slide specs.
 * Each SlideSpec is appended as a TITLE_AND_BODY layout slide.
 *
 * `_slidesOverride` is for testing — inject a mock SlidesApiClient.
 *
 * Requires scope: https://www.googleapis.com/auth/presentations
 */
export async function createSlides(
  vault: SafeStorageVault,
  title: string,
  slideSpecs: SlideSpec[],
  _slidesOverride?: SlidesApiClient,
): Promise<CreateSlidesResult> {
  let slides: SlidesApiClient;
  if (_slidesOverride) {
    slides = _slidesOverride;
  } else {
    const auth = await getOAuth2Client(vault);
    slides = google.slides({ version: 'v1', auth }) as unknown as SlidesApiClient;
  }

  // Create the presentation.
  const created = await slides.presentations.create({
    requestBody: { title },
  });

  const presentationId = created.data.presentationId;
  if (!presentationId) {
    throw new Error('Google Slides API returned no presentationId');
  }

  if (slideSpecs.length === 0) {
    const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;
    return { url, presentationId };
  }

  // Build batchUpdate requests: one createSlide + two insertText per spec.
  // We use TITLE_AND_BODY layout. Each slide is identified by a caller-generated ID.
  const requests: object[] = [];

  for (let i = 0; i < slideSpecs.length; i++) {
    const spec = slideSpecs[i];
    const slideObjectId = `slide_${i}`;
    const titleObjectId = `slide_${i}_title`;
    const bodyObjectId = `slide_${i}_body`;

    // Create the slide.
    requests.push({
      createSlide: {
        objectId: slideObjectId,
        insertionIndex: i + 1, // after the auto-created blank title slide
        slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
        placeholderIdMappings: [
          { layoutPlaceholder: { type: 'TITLE', index: 0 }, objectId: titleObjectId },
          { layoutPlaceholder: { type: 'BODY', index: 0 }, objectId: bodyObjectId },
        ],
      },
    });

    // Insert title text.
    if (spec.title) {
      requests.push({
        insertText: {
          objectId: titleObjectId,
          insertionIndex: 0,
          text: spec.title,
        },
      });
    }

    // Insert body text.
    if (spec.body) {
      requests.push({
        insertText: {
          objectId: bodyObjectId,
          insertionIndex: 0,
          text: spec.body,
        },
      });
    }
  }

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  });

  const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;
  return { url, presentationId };
}
