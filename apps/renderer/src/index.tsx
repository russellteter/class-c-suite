// apps/renderer/src/index.tsx
// Source: docs/decisions/0002-ch1-process-architecture.md §1
// React 18 entry point for the renderer process.
// Subscribes to IPC events via the typed csIpc surface exposed by preload.ts.

import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/glassmorphic.css';
import './styles/typography.css';
import { App } from './App.js';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Renderer: missing #root element in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
