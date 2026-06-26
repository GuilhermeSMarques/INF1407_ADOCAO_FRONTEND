const DEFAULT_API_URL = 'http://127.0.0.1:8000'

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

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, data)
  }

  return data as T
}
