import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Field } from './Field';
import { Segmented } from './Segmented';
import { Toast } from './Toast';

describe('Button', () => {
  it('defaults to type=button so it never submits forms accidentally', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });
});

describe('Field', () => {
  it('wires label, hint, and error to the control', () => {
    render(
      <Field label="Amount" hint="Like 12.50" error="Too small">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAccessibleDescription(/Like 12.50/);
    expect(input).toHaveAccessibleDescription(/Too small/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Too small');
  });

  it('omits aria attributes when clean', () => {
    render(
      <Field label="Note">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('Note');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});

describe('Dialog', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <Dialog open={open} title="Confirm" onClose={() => setOpen(false)}>
          <button type="button">Inside</button>
        </Dialog>
      </>
    );
  }

  it('opens with focus inside, closes on Escape, restores focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Confirm' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('Segmented', () => {
  it('exposes pressed state and switches values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Segmented
        label="Type"
        value="expense"
        onChange={onChange}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Expense' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Income' }));
    expect(onChange).toHaveBeenCalledWith('income');
  });
});

describe('Toast', () => {
  it('announces politely and auto-dismisses', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Saved" onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    vi.advanceTimersByTime(4100);
    expect(onDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('fires the action callback', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Toast message="Deleted" actionLabel="Undo" onAction={onAction} onDismiss={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalled();
  });
});
