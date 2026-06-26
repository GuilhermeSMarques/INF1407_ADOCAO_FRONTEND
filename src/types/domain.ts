export type TipoUsuario = 'adotante' | 'responsavel'

export type Usuario = {
  id: number
  nome: string
  email: string
  telefone: string
  tipo_usuario: TipoUsuario
  criado_em: string
  is_active: boolean
}

export type StatusPet = 'disponivel' | 'em_processo' | 'adotado' | 'indisponivel'

export type Pet = {
  id: number
  nome: string
  especie: string
  raca: string
  idade: number | null
  sexo: string
  porte: string
  descricao: string
  foto: string | null
  status: StatusPet
  responsavel: number
  responsavel_nome: string
  criado_em: string
  atualizado_em: string
}

export type PetFilters = {
  especie?: string
  porte?: string
  sexo?: string
  status?: StatusPet | ''
  search?: string
}

export type PetPayload = {
  nome: string
  especie: string
  raca: string
  idade?: number
  sexo: string
  porte: string
  descricao: string
  status: StatusPet
}
