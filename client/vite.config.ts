import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 9002,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:9102',
          changeOrigin: true,
        }
      }
    }
  }
})
