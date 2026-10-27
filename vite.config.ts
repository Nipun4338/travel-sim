// Vite + the installable shell (SPEC §16): Workbox precaches the game shell and sounds; baked
// Regions and Flight Zones stream in and are cached as you play (CacheFirst: their files are
// content-hashed and never change), while their manifests are checked first so updates arrive.
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { REGION_CACHE } from './src/shared/cache';

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Travel Sim: Dhaka & Bandarban',
        short_name: 'Travel Sim',
        description: 'Drive a Dhaka city bus and fly a light plane over Dhaka and Bandarban.',
        lang: 'bn',
        start_url: '.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#2e1a47',
        theme_color: '#7b1e3a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,png,m4a}'],
        globIgnores: ['regions/**', 'zones/**'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/(regions|zones)\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/(regions|zones)\/[^/]+\/manifest\.json$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: REGION_CACHE, networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) => /\/(regions|zones)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: REGION_CACHE, expiration: { maxEntries: 6000, purgeOnQuotaError: true } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'travel-sim-fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
});
