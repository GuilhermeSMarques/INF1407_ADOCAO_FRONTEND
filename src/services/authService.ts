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

export type PasswordResetResponse = {
  detail: string
  uid?: string
  token?: string
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

export function alterarSenha(token: string, senhaAtual: string, novaSenha: string) {
  return apiRequest<{ detail: string }>('/api/auth/change-password/', {
    method: 'POST',
    token,
    body: JSON.stringify({
      senha_atual: senhaAtual,
      nova_senha: novaSenha,
    }),
  })
}

export function solicitarRecuperacaoSenha(email: string) {
  return apiRequest<PasswordResetResponse>('/api/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function confirmarRecuperacaoSenha(uid: string, token: string, novaSenha: string) {
  return apiRequest<{ detail: string }>('/api/auth/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      token,
      nova_senha: novaSenha,
    }),
  })
}

export function atualizarPerfil(token: string, payload: { email?: string; telefone?: string }) {
  return apiRequest<Usuario>('/api/auth/me/', {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}