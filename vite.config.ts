/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: '/StringsTracker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'String Ledger',
        short_name: 'String Ledger',
        description: 'A local maintenance journal for string players',
        theme_color: '#173f38',
        background_color: '#f5f3ee',
        display: 'standalone',
        id: './',
        start_url: './',
        scope: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: { navigateFallback: 'index.html' },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] },
});
