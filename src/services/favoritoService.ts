import { apiRequest } from '../api/client'
import type { Favorito } from '../types/domain'

export function listarFavoritos(token: string) {
  return apiRequest<Favorito[]>('/api/favoritos/', { token })
}

export function criarFavorito(token: string, petId: number) {
  return apiRequest<Favorito>('/api/favoritos/', {
    method: 'POST',
    token,
    body: JSON.stringify({ pet: petId }),
  })
}

export function removerFavorito(token: string, favoritoId: number) {
  return apiRequest<void>(`/api/favoritos/${favoritoId}/`, {
    method: 'DELETE',
    token,
  })
}
