/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Content-Security-Policy for production builds.
 *
 * - script-src 'self': the build emits only external module scripts, so
 *   inline script injection is fully blocked.
 * - style-src keeps 'unsafe-inline' because React components set inline
 *   style attributes (chart bar widths); no external style hosts.
 * - connect-src 'self': the app makes no network requests by design —
 *   this makes accidental data exfiltration a CSP violation.
 * - frame-ancestors is not settable via <meta>; configure it (and
 *   X-Frame-Options) at the hosting layer if embedding must be blocked.
 *
 * Injected only at build time: the dev server needs Vite's inline
 * react-refresh preamble, which this policy would (correctly) block.
 */
const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'mira:inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: PRODUCTION_CSP },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
});
