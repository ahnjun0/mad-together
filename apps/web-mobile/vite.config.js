import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl' // 추가

export default defineConfig({
  plugins: [
    react(),
    basicSsl() // 추가
  ],
  server: {
    port: 5173,       // 모바일은 5173
    strictPort: true,
    host: true,
    https: true       // 명시적 허용
  }
})