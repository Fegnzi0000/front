const env = import.meta.env as unknown as { VITE_API_BASE_URL?: string }

export const API_BASE_URL = env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api/v1'
