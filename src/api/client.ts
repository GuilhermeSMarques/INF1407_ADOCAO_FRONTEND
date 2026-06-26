import { clearSession, getRefreshToken, saveAccessToken } from '../auth/session'

const DEFAULT_API_URL = 'http://127.0.0.1:8000/'

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown) {
    super('Erro na comunicacao com a API.')
    this.status = status
    this.data = data
  }
}

type ApiRequestOptions = RequestInit & {
  token?: string | null
  retryOnUnauthorized?: boolean
}

type RefreshResponse = {
  access: string
}

function buildUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

function createHeaders(options: ApiRequestOptions, token?: string | null) {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

async function request<T>(path: string, options: ApiRequestOptions, token?: string | null) {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: createHeaders(options, token),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, data)
  }

  return data as T
}

async function refreshAccessToken() {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }

  try {
    const response = await request<RefreshResponse>('/api/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
      retryOnUnauthorized: false,
    })
    saveAccessToken(response.access)
    return response.access
  } catch {
    clearSession()
    return null
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  try {
    return await request<T>(path, options, options.token)
  } catch (error) {
    const shouldRefresh = options.retryOnUnauthorized !== false
      && options.token
      && error instanceof ApiError
      && error.status === 401

    if (!shouldRefresh) {
      throw error
    }

    const newAccessToken = await refreshAccessToken()
    if (!newAccessToken) {
      throw error
    }

    return request<T>(path, options, newAccessToken)
  }
}
