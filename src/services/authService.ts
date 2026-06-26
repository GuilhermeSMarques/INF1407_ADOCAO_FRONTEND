import { apiRequest } from '../api/client'
import type { TipoUsuario, Usuario } from '../types/domain'

export type LoginPayload = {
  email: string
  password: string
}

export type RegistroPayload = {
  nome: string
  email: string
  telefone: string
  tipo_usuario: TipoUsuario
  senha: string
}

export type LoginResponse = {
  access: string
  refresh: string
}

export function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registrar(payload: RegistroPayload) {
  return apiRequest<Usuario>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function buscarUsuarioAtual(token: string) {
  return apiRequest<Usuario>('/api/auth/me/', {
    token,
  })
}