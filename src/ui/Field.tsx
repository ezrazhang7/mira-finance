import { cloneElement, useId } from 'react';
import type { ReactElement } from 'react';

interface FieldChildProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export interface FieldProps {
  label: string;
  /** A single form control; Field wires the label, hint, and error to it. */
  children: ReactElement<FieldChildProps>;
  hint?: string;
  error?: string;
}

/**
 * Accessible form-field wrapper: generates stable ids and connects
 * label / hint / error to the wrapped control with aria attributes.
 */
export function Field({ label, children, hint, error }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const control = cloneElement(children, {
    id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true } : {}),
  });

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {control}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
