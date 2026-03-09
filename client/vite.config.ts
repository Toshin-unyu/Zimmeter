import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = process.env.VITE_API_TARGET || env.VITE_API_TARGET || 'http://localhost:9102';
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        devOptions: {
          enabled: true,
        },
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png'],
        manifest: {
          name: 'Zimmeter',
          short_name: 'Zimmeter',
          description: '業務時間管理システム',
          theme_color: '#1a365d',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    server: {
      host: true,
      port: 9002,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    },
    preview: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
