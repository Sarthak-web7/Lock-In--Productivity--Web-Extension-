import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Each HTML file becomes its own page in dist/ (popup + blocked page)
      input: {
        popup: 'index.html',
        blocked: 'blocked.html',
      },
    },
  },
})
