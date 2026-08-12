import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Auto-dismiss delay; longer when an action is present. */
  durationMs?: number;
}

/**
 * Polite status toast. Announced to screen readers via role="status";
 * auto-dismisses so it never permanently covers the navigation.
 */
export function Toast({ message, actionLabel, onAction, onDismiss, durationMs }: ToastProps) {
  const delay = durationMs ?? (actionLabel ? 8000 : 4000);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, delay);
    return () => window.clearTimeout(timer);
  }, [delay, onDismiss, message]);

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      {actionLabel && onAction ? (
        <button type="button" className="toast__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
