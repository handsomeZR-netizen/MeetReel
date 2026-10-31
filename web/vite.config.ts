import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // 案例数据（转写、录像、知识库资料）放在仓库根目录的 data/，开发时允许读取
  server: { port: 5173, host: true, fs: { allow: ['..'] } },
})
