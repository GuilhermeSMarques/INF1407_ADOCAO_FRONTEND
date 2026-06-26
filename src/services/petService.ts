import { apiRequest } from '../api/client'
import type { Pet, PetFilters, PetPayload } from '../types/domain'

export function listarPets(token: string, filters: PetFilters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  const query = params.toString()
  const path = query ? `/api/pets/?${query}` : '/api/pets/'

  return apiRequest<Pet[]>(path, { token })
}

export function criarPet(token: string, payload: PetPayload) {
  return apiRequest<Pet>('/api/pets/', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function excluirPet(token: string, petId: number) {
  return apiRequest<void>(`/api/pets/${petId}/`, {
    method: 'DELETE',
    token,
  })
}

export function atualizarPet(token: string, petId: number, payload: PetPayload) {
  return apiRequest<Pet>(`/api/pets/${petId}/`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}
