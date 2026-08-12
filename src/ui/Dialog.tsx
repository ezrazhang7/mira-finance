import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog: focus moves inside on open, Tab cycles within, Escape
 * and overlay clicks close, and focus returns to the opener on close.
 */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute('disabled'),
      );
      if (focusable.length === 0) {
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
