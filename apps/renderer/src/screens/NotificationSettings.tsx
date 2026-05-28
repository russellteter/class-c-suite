// apps/renderer/src/screens/NotificationSettings.tsx
// Source: tasks/ch10-renderer-brief.md §3, ADR §10.4
// NotificationSettings panel. 3 toggles (one per notification type):
//   - Tripwire flip — default ON
//   - Memo ready    — default ON
//   - Job failure   — default ON
// Persists to SQLite notification_settings table via IPC.
// Subscribes to scheduler.notification.permission_denied; shows in-app banner.
// WCAG AA: role=switch, aria-checked, labelled fieldset, :focus-visible.
// TODO ch10-runtime-ship: notification.settings.get / notification.settings.set / scheduler.notification.permission_denied

import React, { useEffect, useState, useCallback } from 'react';
import '../design/tokens.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationSettingsState {
  tripwireFlip: boolean;
  memoReady: boolean;
  jobFailure: boolean;
}

const DEFAULTS: NotificationSettingsState = {
  tripwireFlip: true,
  memoReady:    true,
  jobFailure:   true,
};

// ── IPC stubs ──────────────────────────────────────────────────────────────

async function fetchNotificationSettings(): Promise<Partial<NotificationSettingsState>> {
  // TODO ch10-runtime-ship: implement notification.settings.get IPC channel
  if (typeof window === 'undefined' || !window.ipc) return {};
  try {
    const result = await window.ipc.invoke('notification.settings.get');
    return (result as Partial<NotificationSettingsState>) ?? {};
  } catch {
    return {};
  }
}

async function saveNotificationSettings(settings: NotificationSettingsState): Promise<void> {
  // TODO ch10-runtime-ship: implement notification.settings.set IPC channel
  if (typeof window === 'undefined' || !window.ipc) return;
  await window.ipc.invoke('notification.settings.set', settings).catch(() => {});
}

// ── ToggleRow ────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-3)',
        background: 'var(--color-surface-1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <label
          htmlFor={id}
          style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', display: 'block', cursor: 'pointer' }}
        >
          {label}
        </label>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {description}
        </span>
      </div>

      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? 'on' : 'off'}`}
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          cursor: 'pointer',
          background: checked ? 'var(--color-success)' : 'var(--color-surface-3)',
          position: 'relative',
          transition: 'background var(--motion-fast)',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--color-text-primary)',
            transition: 'left var(--motion-fast)',
          }}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}

// ── Permission denied banner ─────────────────────────────────────────────────

interface PermissionBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

function PermissionBanner({ visible, onDismiss }: PermissionBannerProps): React.ReactElement | null {
  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="permission-denied-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'rgba(255,92,92,0.10)',
        border: '1px solid var(--color-error)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-5)',
        color: 'var(--color-text-primary)',
      }}
    >
      <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>
        macOS notifications disabled. Re-enable in System Settings → Notifications → C-Suite.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification permission warning"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-base)',
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── NotificationSettings screen ───────────────────────────────────────────────

export interface NotificationSettingsProps {
  onBack?: () => void;
  /** Inject initial settings (for tests). */
  initialSettings?: Partial<NotificationSettingsState>;
  /** Inject permission denied state (for tests). */
  permissionDenied?: boolean;
}

export function NotificationSettings({
  onBack,
  initialSettings,
  permissionDenied: permissionDeniedProp = false,
}: NotificationSettingsProps): React.ReactElement {
  const [settings, setSettings] = useState<NotificationSettingsState>({
    ...DEFAULTS,
    ...initialSettings,
  });
  const [permDenied, setPermDenied] = useState(permissionDeniedProp);
  const [permBannerDismissed, setPermBannerDismissed] = useState(false);

  // Load settings from IPC on mount
  useEffect(() => {
    if (initialSettings) return;
    fetchNotificationSettings().then((loaded) => {
      setSettings((prev) => ({ ...prev, ...loaded }));
    });
  }, [initialSettings]);

  // Subscribe to permission_denied event
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ipc) return;

    // TODO ch10-runtime-ship: Runtime emits scheduler.notification.permission_denied when macOS denies notification permission
    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const msg = raw as { kind?: string };
      if (msg?.kind === 'scheduler.notification.permission_denied') {
        setPermDenied(true);
        setPermBannerDismissed(false);
      }
    });

    return cleanup;
  }, []);

  const handleChange = useCallback(async (key: keyof NotificationSettingsState, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveNotificationSettings(next);
  }, [settings]);

  return (
    <main
      aria-label="Settings: Notifications"
      style={{
        padding: 'var(--space-6)',
        maxWidth: 600,
        margin: '0 auto',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
            aria-label="Back to Settings"
          >
            ← Back
          </button>
        )}
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>Notifications</h1>
      </div>

      <PermissionBanner
        visible={permDenied && !permBannerDismissed}
        onDismiss={() => setPermBannerDismissed(true)}
      />

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
        Choose which events trigger macOS notifications.
      </p>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-3)',
        }}>
          Notification types
        </legend>

        <ToggleRow
          id="notif-tripwire-flip"
          label="Tripwire flip"
          description="Notify when a cash or GTM tripwire changes state."
          checked={settings.tripwireFlip}
          onChange={(v) => handleChange('tripwireFlip', v)}
        />

        <ToggleRow
          id="notif-memo-ready"
          label="Memo ready"
          description="Notify when a scheduled job produces a new memo."
          checked={settings.memoReady}
          onChange={(v) => handleChange('memoReady', v)}
        />

        <ToggleRow
          id="notif-job-failure"
          label="Job failure"
          description="Notify when a scheduled job fails or is skipped due to auth expiry."
          checked={settings.jobFailure}
          onChange={(v) => handleChange('jobFailure', v)}
        />
      </fieldset>
    </main>
  );
}
