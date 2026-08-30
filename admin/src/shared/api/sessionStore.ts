const REFRESH_TOKEN_KEY = 'ai-ganfan.admin.refresh-token'
let accessToken: string | null = null

export const sessionStore = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (nextAccessToken: string, refreshToken: string): void => {
    accessToken = nextAccessToken
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clear: (): void => {
    accessToken = null
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}
