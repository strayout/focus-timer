import { defineConfig } from '@playwright/test'
const preview = process.env.E2E_PREVIEW === '1'
const origin = preview ? 'http://127.0.0.1:4173' : 'http://localhost:5173'
export default defineConfig({
  testDir: './tests/browser', timeout: 30000, use: { baseURL: origin, headless: true, reducedMotion: 'reduce', launchOptions: { channel: 'msedge' } },
  webServer: {
    command: preview ? 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort' : 'npm run dev -- --host 127.0.0.1',
    url: origin, reuseExistingServer: !preview,
  },
})
