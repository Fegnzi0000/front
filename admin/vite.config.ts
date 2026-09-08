import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const apiBaseUrl = (process.env.VITE_API_BASE_URL || loadEnv(mode, process.cwd(), '').VITE_API_BASE_URL)?.trim()
  if (mode === 'production' && (!apiBaseUrl || !apiBaseUrl.startsWith('https://'))) {
    throw new Error('管理员网页生产构建必须设置 HTTPS VITE_API_BASE_URL')
  }
  return {
    plugins: [react()],
    server: { port: 5173 },
    build: { sourcemap: false },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.test.{ts,tsx}'],
      css: true,
      clearMocks: true,
      pool: 'threads',
      maxWorkers: 1,
      fileParallelism: false,
    },
  }
})
