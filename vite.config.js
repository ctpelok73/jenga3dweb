import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        globIgnores: ['**/rapier-*.js', '**/r3f-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(rapier|r3f)-.*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'heavy-3d-runtime-cache',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /https:\/\/pagead2\.googlesyndication\.com/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /https:\/\/googleadservices\.com/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /https:\/\/doubleclick\.net/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /https:\/\/google-analytics\.com/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /https:\/\/googletagmanager\.com/i,
            handler: 'NetworkOnly',
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/sw\.js$/, /^\/manifest\.json$/],
      },
    }),
  ],
  build: {
    modulePreload: false,
    chunkSizeWarningLimit: 2500, // increased limit to accommodate large rapier chunk
    minify: 'terser',
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (
            id.includes('node_modules/@react-three/fiber') ||
            id.includes('node_modules/@react-three/drei')
          ) {
            return 'r3f';
          }
          if (id.includes('node_modules/@react-three/rapier')) {
            return 'rapier';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          return undefined;
        },
      },
    },
  },
});
