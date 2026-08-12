import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('hydrates and shows the dashboard with navigation landmarks', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('navigates between pages via the bottom nav', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Home' });

    await user.click(screen.getByRole('button', { name: 'Budgets' }));
    expect(await screen.findByRole('heading', { name: 'Budgets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Budgets' })).toHaveAttribute('aria-current', 'page');
  });
});
