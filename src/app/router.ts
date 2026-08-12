import { useCallback, useEffect, useState } from 'react';
import type { Page } from '@/voice/intents';

/**
 * Minimal hash router. Five flat routes need no routing library — and
 * every dependency Mira avoids is one users don't have to trust.
 */
const PAGES: readonly Page[] = ['dashboard', 'transactions', 'budgets', 'insights', 'settings'];

export function pageFromHash(hash: string): Page {
  const name = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return (PAGES as readonly string[]).includes(name) ? (name as Page) : 'dashboard';
}

export function useHashRoute(): [Page, (page: Page) => void] {
  const [page, setPage] = useState<Page>(() => pageFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Page) => {
    window.location.hash = `/${next}`;
  }, []);

  return [page, navigate];
}
