import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 多页面：首页是风格总览，每种风格一个独立页面，样式互不干扰。
// 演示数据直接读 ../web/src/data/demo.ts，和正式前端保持同一份。
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@web': r('../web/src'), '@': r('./src') },
    dedupe: ['react', 'react-dom'],
  },
  server: { port: 5174, host: true, fs: { allow: [r('..')] } },
  build: {
    rollupOptions: {
      input: {
        main: r('./index.html'),
        glass: r('./glass/index.html'),
        chat: r('./chat/index.html'),
        ui: r('./ui/index.html'),
        night: r('./night/index.html'),
        sketch: r('./sketch/index.html'),
      },
    },
  },
})
