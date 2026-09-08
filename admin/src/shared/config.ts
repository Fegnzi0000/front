const env = import.meta.env as unknown as { VITE_API_BASE_URL?: string }

const configuredApiBaseUrl = env.VITE_API_BASE_URL?.trim()

if (import.meta.env.PROD && (!configuredApiBaseUrl || !configuredApiBaseUrl.startsWith('https://'))) {
  throw new Error('生产构建必须设置 HTTPS VITE_API_BASE_URL')
}

export const API_BASE_URL = configuredApiBaseUrl || 'http://127.0.0.1:8080/api/v1'
