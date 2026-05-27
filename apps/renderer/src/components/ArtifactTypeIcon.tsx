// apps/renderer/src/components/ArtifactTypeIcon.tsx
// Source: ch6-renderer-brief.md §Shared components
// One SVG per ArtifactType. Uses design tokens for color.
// Size defaults to 16px; override via className or style.

import React from 'react';
import type { ArtifactType } from '@c-suite/shared-types/writeback';

interface ArtifactTypeIconProps {
  type: ArtifactType;
  size?: number;
  className?: string;
}

export function ArtifactTypeIcon({ type, size = 16, className }: ArtifactTypeIconProps): React.ReactElement {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    className,
    'aria-hidden': true as const,
  };

  switch (type) {
    case 'position':
      // Anchor — stable stance
      return (
        <svg {...props}>
          <circle cx="8" cy="5" r="2.5" stroke="var(--color-gold-500)" strokeWidth="1.5" />
          <path d="M8 7.5v5M5 10.5l3 2 3-2" stroke="var(--color-gold-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'decision':
      // Diamond — binary choice
      return (
        <svg {...props}>
          <path d="M8 1.5l5 6.5-5 6.5L3 8l5-6.5z" stroke="var(--color-purple-400)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );

    case 'prediction':
      // Arrow trending up — forecast
      return (
        <svg {...props}>
          <path d="M2 12L6 7l3 3 5-6" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10.5 4h3.5v3.5" stroke="var(--color-info)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'pre-mortem-update':
      // Warning shield — risk assessment
      return (
        <svg {...props}>
          <path d="M8 1.5L2 4.5v4c0 3 2.5 5 6 6 3.5-1 6-3 6-6v-4L8 1.5z" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 6v3M8 10.5v.5" stroke="var(--color-warning)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'stakeholder-update':
      // Person with speech bubble — communication
      return (
        <svg {...props}>
          <circle cx="8" cy="5" r="2.5" stroke="var(--color-success)" strokeWidth="1.5" />
          <path d="M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'workstream-advance':
      // Chevron-right in circle — progress
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" stroke="var(--color-purple-500)" strokeWidth="1.5" />
          <path d="M6.5 5.5L9.5 8l-3 2.5" stroke="var(--color-purple-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    default: {
      // Exhaustive check
      const _exhaustive: never = type;
      void _exhaustive;
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6.5" stroke="var(--color-text-muted)" strokeWidth="1.5" />
        </svg>
      );
    }
  }
}
