import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// pc port는 https 필요 없음
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // pc port is 5174
    strictPort: true,
    host: true
  },
})
