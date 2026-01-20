import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// pc port는 https 필요 없음
// https://vite.dev/config/
export default defineConfig({
  base: '/pc/',
  plugins: [react()],
  server: {
    port: 5174, // pc port is 5174
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  assetsInclude: ['**/*.glb', '**/*.gltf'], // Handle 3D model files as assets
})
