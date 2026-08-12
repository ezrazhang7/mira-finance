import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import { AppStoreProvider } from '@/store/AppStore';
import { Repository } from '@/storage/repository';
import { VoiceAssistant } from './VoiceAssistant';

function renderAssistant(onNavigate = vi.fn()) {
  const factory = new IDBFactory();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider openRepository={() => Repository.open(factory)}>
      <I18nProvider locale="en" currency="USD">
        {children}
      </I18nProvider>
    </AppStoreProvider>
  );
  return { onNavigate, ...render(<VoiceAssistant onNavigate={onNavigate} />, { wrapper }) };
}

// jsdom has no SpeechRecognition, so the assistant must fall back to
// typed commands — which is exactly the no-mic user experience.
describe('VoiceAssistant (no speech support)', () => {
  it('opens, explains the fallback, and executes a typed expense', async () => {
    const user = userEvent.setup();
    renderAssistant();

    await user.click(screen.getByRole('button', { name: 'Talk to Mira' }));
    const dialog = await screen.findByRole('dialog', { name: 'Talk to Mira' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/no microphone support/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Type a command instead'), 'I spent 12.50 on groceries');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Added a $12.50 expense in Groceries.')).toBeInTheDocument();
  });

  it('answers queries against stored data and navigates', async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderAssistant();

    await user.click(screen.getByRole('button', { name: 'Talk to Mira' }));
    const input = await screen.findByLabelText('Type a command instead');

    await user.type(input, 'I spent 10 on food');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Added a $10.00 expense in Groceries.');

    await user.type(input, 'how much did I spend this month');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('You spent $10.00 this month.')).toBeInTheDocument();

    await user.type(input, 'go to budgets');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('budgets'));
  });

  it('replies helpfully to unrecognized input', async () => {
    const user = userEvent.setup();
    renderAssistant();

    await user.click(screen.getByRole('button', { name: 'Talk to Mira' }));
    await user.type(await screen.findByLabelText('Type a command instead'), 'sing me a song');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText(/did not catch that/i)).toBeInTheDocument();
  });
});
