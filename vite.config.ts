import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // mini.html is the standalone floating window (desktop shell, or a plain browser popup).
  build: { rolldownOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), mini: fileURLToPath(new URL('./mini.html', import.meta.url)) } } },
  // Tauri expects a fixed dev port and must not be restarted by Rust build output.
  clearScreen: false,
  server: { strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
