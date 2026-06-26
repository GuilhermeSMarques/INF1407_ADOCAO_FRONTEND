import { apiRequest } from '../api/client'
import type { SolicitacaoAdocao } from '../types/domain'

export function listarSolicitacoes(token: string) {
  return apiRequest<SolicitacaoAdocao[]>('/api/solicitacoes/', { token })
}

export function criarSolicitacao(token: string, petId: number, mensagem: string) {
  return apiRequest<SolicitacaoAdocao>('/api/solicitacoes/', {
    method: 'POST',
    token,
    body: JSON.stringify({
      pet: petId,
      mensagem,
    }),
  })
}

export function cancelarSolicitacao(token: string, solicitacaoId: number) {
  return apiRequest<void>(`/api/solicitacoes/${solicitacaoId}/`, {
    method: 'DELETE',
    token,
  })
}

export function aprovarSolicitacao(token: string, solicitacaoId: number) {
  return apiRequest<SolicitacaoAdocao>(`/api/solicitacoes/${solicitacaoId}/aprovar/`, {
    method: 'POST',
    token,
  })
}

export function recusarSolicitacao(token: string, solicitacaoId: number) {
  return apiRequest<SolicitacaoAdocao>(`/api/solicitacoes/${solicitacaoId}/recusar/`, {
    method: 'POST',
    token,
  })
}
