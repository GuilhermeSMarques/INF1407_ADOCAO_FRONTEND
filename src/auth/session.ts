// Chaves usadas no localStorage para persistir os tokens JWT entre sessões
const ACCESS_TOKEN_KEY = 'adocao_access_token'
const REFRESH_TOKEN_KEY = 'adocao_refresh_token'

export type Tokens = {
  access: string
  refresh: string
}

export function saveTokens(tokens: Tokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh)
}

export function saveAccessToken(access: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
