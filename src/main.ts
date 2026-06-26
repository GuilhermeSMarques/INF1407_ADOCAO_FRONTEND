import './style.css'
import { getApiBaseUrl } from './api/client'
import { clearSession, getAccessToken, saveTokens } from './auth/session'
import { buscarUsuarioAtual, login, registrar } from './services/authService'
import { atualizarPet, criarPet, excluirPet, listarPets } from './services/petService'
import {
  aprovarSolicitacao,
  cancelarSolicitacao,
  criarSolicitacao,
  listarSolicitacoes,
  recusarSolicitacao,
} from './services/solicitacaoService'
import type { Pet, PetFilters, PetPayload, SolicitacaoAdocao, StatusPet, TipoUsuario, Usuario } from './types/domain'
import { createElement, createText } from './utils/dom'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento #app nao encontrado.')
}

const root = app

type AppState = {
  usuario: Usuario | null
  pets: Pet[]
  solicitacoes: SolicitacaoAdocao[]
  petFilters: PetFilters
  editingPet: Pet | null
  loading: boolean
  message: string
}

const state: AppState = {
  usuario: null,
  pets: [],
  solicitacoes: [],
  petFilters: {},
  editingPet: null,
  loading: false,
  message: '',
}

function getInput(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function createField(labelText: string, name: string, type = 'text', required = true) {
  const inputId = `field-${name}`
  const label = createElement('label', { htmlFor: inputId, text: labelText })
  const input = createElement('input', {
    id: inputId,
    name,
    placeholder: labelText,
    required,
  })
  input.type = type

  return createElement('div', { className: 'form-field' }, label, input)
}

function createHeader() {
  const title = createElement('h1', { text: 'Adocao de Pets' })
  const subtitle = createElement('p', {
    className: 'app-subtitle',
    text: 'Frontend academico consumindo a API Django REST.',
  })

  return createElement('header', { className: 'app-header' }, title, subtitle)
}

function createNavigation() {
  const nav = createElement('nav', { className: 'app-nav', ariaLabel: 'Navegacao principal' })
  const labels = ['Pets', 'Minhas solicitacoes', 'Favoritos', 'Painel']

  labels.forEach((label, index) => {
    nav.append(createElement('button', {
      className: index === 0 ? 'nav-button active' : 'nav-button',
      text: label,
      type: 'button',
    }))
  })

  return nav
}

function createMessage() {
  if (!state.message) {
    return createElement('div', { className: 'message empty' })
  }

  return createElement('div', { className: 'message', text: state.message })
}

function createLoginForm() {
  const form = createElement(
    'form',
    { className: 'auth-form' },
    createElement('h2', { text: 'Entrar' }),
    createField('Email', 'email', 'email'),
    createField('Senha', 'password', 'password'),
    createElement('button', { className: 'primary-button', text: 'Entrar', type: 'submit' }),
  )

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.loading = true
    state.message = 'Entrando...'
    render()

    try {
      const tokens = await login({
        email: getInput(form, 'email'),
        password: getInput(form, 'password'),
      })
      saveTokens(tokens)
      state.usuario = await buscarUsuarioAtual(tokens.access)
      state.message = 'Login realizado com sucesso.'
      await carregarDadosPrincipais()
    } catch {
      state.message = 'Nao foi possivel fazer login.'
    } finally {
      state.loading = false
      render()
    }
  })

  return form
}

function createRegisterForm() {
  const form = createElement(
    'form',
    { className: 'auth-form' },
    createElement('h2', { text: 'Criar conta' }),
    createField('Nome', 'nome'),
    createField('Email', 'email', 'email'),
    createField('Telefone', 'telefone', 'tel'),
    createField('Senha', 'senha', 'password'),
  )

  const tipoLabel = createElement('label', { htmlFor: 'field-tipo_usuario', text: 'Tipo de usuario' })
  const tipoSelect = document.createElement('select')
  tipoSelect.id = 'field-tipo_usuario'
  tipoSelect.name = 'tipo_usuario'

  const adotanteOption = document.createElement('option')
  adotanteOption.value = 'adotante'
  adotanteOption.textContent = 'Adotante'

  const responsavelOption = document.createElement('option')
  responsavelOption.value = 'responsavel'
  responsavelOption.textContent = 'Responsavel'

  tipoSelect.append(adotanteOption, responsavelOption)
  form.append(createElement('div', { className: 'form-field' }, tipoLabel, tipoSelect))
  form.append(createElement('button', { className: 'secondary-button', text: 'Cadastrar', type: 'submit' }))

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.loading = true
    state.message = 'Criando conta...'
    render()

    try {
      await registrar({
        nome: getInput(form, 'nome'),
        email: getInput(form, 'email'),
        telefone: getInput(form, 'telefone'),
        senha: getInput(form, 'senha'),
        tipo_usuario: getInput(form, 'tipo_usuario') as TipoUsuario,
      })
      state.message = 'Conta criada. Voce ja pode entrar.'
    } catch {
      state.message = 'Nao foi possivel criar a conta.'
    } finally {
      state.loading = false
      render()
    }
  })

  return form
}

function createUserPanel(usuario: Usuario) {
  const logoutButton = createElement('button', { className: 'secondary-button', text: 'Sair', type: 'button' })
  logoutButton.addEventListener('click', () => {
    clearSession()
    state.usuario = null
    state.pets = []
    state.solicitacoes = []
    state.editingPet = null
    state.message = 'Sessao encerrada.'
    render()
  })

  return createElement(
    'section',
    { className: 'status-panel', ariaLabel: 'Usuario autenticado' },
    createElement('h2', { text: 'Sessao ativa' }),
    createElement('p', { className: 'status-text' }, createText('Usuario: '), createElement('strong', { text: usuario.nome })),
    createElement('p', { className: 'status-text' }, createText('Perfil: '), createElement('strong', { text: usuario.tipo_usuario })),
    logoutButton,
  )
}

function createAuthArea() {
  if (state.usuario) {
    return createUserPanel(state.usuario)
  }

  return createElement(
    'section',
    { className: 'auth-grid', ariaLabel: 'Autenticacao' },
    createLoginForm(),
    createRegisterForm(),
  )
}

function getNumberInput(form: HTMLFormElement, name: string) {
  const value = getInput(form, name)
  return value ? Number(value) : undefined
}

function createFilterSelect(name: string, labelText: string, options: Array<[string, string]>) {
  const fieldId = `filter-${name}`
  const label = createElement('label', { htmlFor: fieldId, text: labelText })
  const select = document.createElement('select')
  select.id = fieldId
  select.name = name

  options.forEach(([value, text]) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = text
    select.append(option)
  })

  return createElement('div', { className: 'form-field' }, label, select)
}

function createSelect(name: string, labelText: string, options: Array<[string, string]>) {
  const fieldId = `field-${name}`
  const label = createElement('label', { htmlFor: fieldId, text: labelText })
  const select = document.createElement('select')
  select.id = fieldId
  select.name = name

  options.forEach(([value, text]) => {
    const option = document.createElement('option')
    option.value = value
    option.textContent = text
    select.append(option)
  })

  return createElement('div', { className: 'form-field' }, label, select)
}

function createPetsFilters() {
  const form = createElement(
    'form',
    { className: 'filters-form' },
    createField('Busca', 'search', 'search', false),
    createFilterSelect('especie', 'Especie', [
      ['', 'Todas'],
      ['cachorro', 'Cachorro'],
      ['gato', 'Gato'],
      ['outro', 'Outro'],
    ]),
    createFilterSelect('porte', 'Porte', [
      ['', 'Todos'],
      ['pequeno', 'Pequeno'],
      ['medio', 'Medio'],
      ['grande', 'Grande'],
    ]),
    createElement('button', { className: 'secondary-button', text: 'Filtrar', type: 'submit' }),
  )

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.petFilters = {
      search: getInput(form, 'search'),
      especie: getInput(form, 'especie'),
      porte: getInput(form, 'porte'),
    }
    await carregarPets()
  })

  return form
}

function createPetCard(pet: Pet) {
  const children: Node[] = [
    createElement('h3', { text: pet.nome }),
    createElement('p', { className: 'pet-meta' }, createText(`${pet.especie} - ${pet.porte} - ${pet.status}`)),
    createElement('p', { className: 'pet-description', text: pet.descricao || 'Sem descricao cadastrada.' }),
    createElement('p', { className: 'pet-meta' }, createText('Responsavel: '), createElement('strong', { text: pet.responsavel_nome })),
  ]

  if (state.usuario?.tipo_usuario === 'responsavel') {
    const editButton = createElement('button', { className: 'secondary-button', text: 'Editar', type: 'button' })
    editButton.addEventListener('click', () => {
      state.editingPet = pet
      state.message = `Editando ${pet.nome}.`
      render()
    })

    const deleteButton = createElement('button', { className: 'danger-button', text: 'Excluir', type: 'button' })
    deleteButton.addEventListener('click', () => {
      void removerPet(pet.id)
    })
    children.push(createElement('div', { className: 'card-actions' }, editButton, deleteButton))
  }

  if (state.usuario?.tipo_usuario === 'adotante' && pet.status === 'disponivel') {
    const requestButton = createElement('button', { className: 'primary-button', text: 'Solicitar adocao', type: 'button' })
    requestButton.addEventListener('click', () => {
      void solicitarAdocao(pet.id)
    })
    children.push(createElement('div', { className: 'card-actions' }, requestButton))
  }

  return createElement('article', { className: 'pet-card' }, ...children)
}

function createPetForm() {
  if (state.usuario?.tipo_usuario !== 'responsavel') {
    return createElement('div', { className: 'empty' })
  }

  const editingPet = state.editingPet
  const title = editingPet ? 'Editar pet' : 'Cadastrar pet'
  const submitText = editingPet ? 'Salvar alteracoes' : 'Cadastrar pet'

  const form = createElement(
    'form',
    { className: 'pet-form' },
    createElement('h2', { text: title }),
    createField('Nome', 'nome'),
    createSelect('especie', 'Especie', [
      ['cachorro', 'Cachorro'],
      ['gato', 'Gato'],
      ['outro', 'Outro'],
    ]),
    createField('Raca', 'raca', 'text', false),
    createField('Idade', 'idade', 'number', false),
    createSelect('sexo', 'Sexo', [
      ['nao_informado', 'Nao informado'],
      ['macho', 'Macho'],
      ['femea', 'Femea'],
    ]),
    createSelect('porte', 'Porte', [
      ['pequeno', 'Pequeno'],
      ['medio', 'Medio'],
      ['grande', 'Grande'],
    ]),
    createSelect('status', 'Status', [
      ['disponivel', 'Disponivel'],
      ['em_processo', 'Em processo'],
      ['adotado', 'Adotado'],
      ['indisponivel', 'Indisponivel'],
    ]),
    createField('Descricao', 'descricao', 'text', false),
    createElement('button', { className: 'primary-button', text: submitText, type: 'submit' }),
  )

  if (editingPet) {
    setFormValue(form, 'nome', editingPet.nome)
    setFormValue(form, 'especie', editingPet.especie)
    setFormValue(form, 'raca', editingPet.raca)
    setFormValue(form, 'idade', editingPet.idade ? String(editingPet.idade) : '')
    setFormValue(form, 'sexo', editingPet.sexo)
    setFormValue(form, 'porte', editingPet.porte)
    setFormValue(form, 'status', editingPet.status)
    setFormValue(form, 'descricao', editingPet.descricao)

    const cancelButton = createElement('button', { className: 'secondary-button', text: 'Cancelar edicao', type: 'button' })
    cancelButton.addEventListener('click', () => {
      state.editingPet = null
      state.message = ''
      render()
    })
    form.append(cancelButton)
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const payload = {
      nome: getInput(form, 'nome'),
      especie: getInput(form, 'especie'),
      raca: getInput(form, 'raca'),
      idade: getNumberInput(form, 'idade'),
      sexo: getInput(form, 'sexo'),
      porte: getInput(form, 'porte'),
      status: getInput(form, 'status') as StatusPet,
      descricao: getInput(form, 'descricao'),
    }

    if (state.editingPet) {
      await salvarPet(state.editingPet.id, payload)
      return
    }

    await cadastrarPet(payload)
  })

  return createElement(
    'section',
    { className: 'pets-section', ariaLabel: 'Cadastro de pet' },
    form,
  )
}

function setFormValue(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name)
  if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
    field.value = value
  }
}

function createPetsSection() {
  if (!state.usuario) {
    return createElement(
      'section',
      { className: 'status-panel', ariaLabel: 'Pets' },
      createElement('h2', { text: 'Pets' }),
      createElement('p', { className: 'status-text', text: 'Entre para visualizar os pets disponiveis.' }),
    )
  }

  const reloadButton = createElement('button', { className: 'secondary-button', text: 'Atualizar pets', type: 'button' })
  reloadButton.addEventListener('click', () => {
    void carregarPets()
  })

  const list = createElement('div', { className: 'pets-list' })
  if (state.pets.length === 0) {
    list.append(createElement('p', { className: 'status-text', text: 'Nenhum pet encontrado.' }))
  } else {
    state.pets.forEach((pet) => list.append(createPetCard(pet)))
  }

  return createElement(
    'section',
    { className: 'pets-section', ariaLabel: 'Lista de pets' },
    createElement('div', { className: 'section-heading' }, createElement('h2', { text: 'Pets' }), reloadButton),
    createPetsFilters(),
    list,
  )
}

function createSolicitacaoCard(solicitacao: SolicitacaoAdocao) {
  const children: Node[] = [
    createElement('h3', { text: solicitacao.pet_nome }),
    createElement('p', { className: 'pet-meta' }, createText(`Status: ${solicitacao.status}`)),
    createElement('p', { className: 'pet-description', text: solicitacao.mensagem || 'Sem mensagem.' }),
  ]

  if (state.usuario?.tipo_usuario === 'adotante' && solicitacao.status === 'pendente') {
    const cancelButton = createElement('button', { className: 'danger-button', text: 'Cancelar', type: 'button' })
    cancelButton.addEventListener('click', () => {
      void cancelarAdocao(solicitacao.id)
    })
    children.push(createElement('div', { className: 'card-actions' }, cancelButton))
  }

  if (state.usuario?.tipo_usuario === 'responsavel' && solicitacao.status === 'pendente') {
    const approveButton = createElement('button', { className: 'primary-button', text: 'Aprovar', type: 'button' })
    approveButton.addEventListener('click', () => {
      void decidirSolicitacao(solicitacao.id, 'aprovar')
    })

    const rejectButton = createElement('button', { className: 'danger-button', text: 'Recusar', type: 'button' })
    rejectButton.addEventListener('click', () => {
      void decidirSolicitacao(solicitacao.id, 'recusar')
    })

    children.push(createElement('div', { className: 'card-actions' }, approveButton, rejectButton))
  }

  return createElement('article', { className: 'pet-card' }, ...children)
}

function createSolicitacoesSection() {
  if (!state.usuario) {
    return createElement('div', { className: 'empty' })
  }

  const reloadButton = createElement('button', { className: 'secondary-button', text: 'Atualizar', type: 'button' })
  reloadButton.addEventListener('click', () => {
    void carregarSolicitacoes()
  })

  const list = createElement('div', { className: 'pets-list' })
  if (state.solicitacoes.length === 0) {
    list.append(createElement('p', { className: 'status-text', text: 'Nenhuma solicitacao encontrada.' }))
  } else {
    state.solicitacoes.forEach((solicitacao) => list.append(createSolicitacaoCard(solicitacao)))
  }

  return createElement(
    'section',
    { className: 'pets-section', ariaLabel: 'Solicitacoes de adocao' },
    createElement('div', { className: 'section-heading' }, createElement('h2', { text: 'Solicitacoes' }), reloadButton),
    list,
  )
}

function createMainContent() {
  const apiUrl = createElement('strong', { text: getApiBaseUrl() })

  return createElement(
    'main',
    { className: 'app-main' },
    createElement(
      'section',
      { className: 'status-panel', ariaLabel: 'Status da aplicacao' },
      createElement('h2', { text: 'Conexao da API' }),
      createElement('p', { className: 'status-text' }, createText('API configurada: '), apiUrl),
      createMessage(),
    ),
    createAuthArea(),
    createPetForm(),
    createPetsSection(),
    createSolicitacoesSection(),
  )
}

function render() {
  root.replaceChildren(createHeader(), createNavigation(), createMainContent())
}

async function bootstrap() {
  const token = getAccessToken()
  if (!token) {
    render()
    return
  }

  state.loading = true
  state.message = 'Restaurando sessao...'
  render()

  try {
    state.usuario = await buscarUsuarioAtual(token)
    state.message = 'Sessao restaurada.'
    await carregarDadosPrincipais()
  } catch {
    clearSession()
    state.message = 'Sessao expirada. Entre novamente.'
  } finally {
    state.loading = false
    render()
  }
}

async function carregarDadosPrincipais() {
  await carregarPets()
  await carregarSolicitacoes()
}

async function carregarPets() {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Carregando pets...'
  render()

  try {
    state.pets = await listarPets(token, state.petFilters)
    state.message = 'Pets carregados.'
  } catch {
    state.message = 'Nao foi possivel carregar os pets.'
  } finally {
    state.loading = false
    render()
  }
}

async function carregarSolicitacoes() {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Carregando solicitacoes...'
  render()

  try {
    state.solicitacoes = await listarSolicitacoes(token)
    state.message = 'Solicitacoes carregadas.'
  } catch {
    state.message = 'Nao foi possivel carregar as solicitacoes.'
  } finally {
    state.loading = false
    render()
  }
}

async function cadastrarPet(payload: PetPayload) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Cadastrando pet...'
  render()

  try {
    await criarPet(token, payload)
    state.editingPet = null
    state.message = 'Pet cadastrado.'
    await carregarPets()
  } catch {
    state.message = 'Nao foi possivel cadastrar o pet.'
  } finally {
    state.loading = false
    render()
  }
}

async function solicitarAdocao(petId: number) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Enviando solicitacao...'
  render()

  try {
    await criarSolicitacao(token, petId, 'Tenho interesse em adotar este pet.')
    state.message = 'Solicitacao enviada.'
    await carregarSolicitacoes()
  } catch {
    state.message = 'Nao foi possivel enviar a solicitacao.'
  } finally {
    state.loading = false
    render()
  }
}

async function cancelarAdocao(solicitacaoId: number) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Cancelando solicitacao...'
  render()

  try {
    await cancelarSolicitacao(token, solicitacaoId)
    state.solicitacoes = state.solicitacoes.filter((solicitacao) => solicitacao.id !== solicitacaoId)
    state.message = 'Solicitacao cancelada.'
  } catch {
    state.message = 'Nao foi possivel cancelar a solicitacao.'
  } finally {
    state.loading = false
    render()
  }
}

async function decidirSolicitacao(solicitacaoId: number, decisao: 'aprovar' | 'recusar') {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = decisao === 'aprovar' ? 'Aprovando solicitacao...' : 'Recusando solicitacao...'
  render()

  try {
    const atualizada = decisao === 'aprovar'
      ? await aprovarSolicitacao(token, solicitacaoId)
      : await recusarSolicitacao(token, solicitacaoId)
    state.solicitacoes = state.solicitacoes.map((solicitacao) => (
      solicitacao.id === atualizada.id ? atualizada : solicitacao
    ))
    state.message = decisao === 'aprovar' ? 'Solicitacao aprovada.' : 'Solicitacao recusada.'
    if (decisao === 'aprovar') {
      await carregarPets()
    }
  } catch {
    state.message = 'Nao foi possivel atualizar a solicitacao.'
  } finally {
    state.loading = false
    render()
  }
}

async function salvarPet(petId: number, payload: PetPayload) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Salvando pet...'
  render()

  try {
    const petAtualizado = await atualizarPet(token, petId, payload)
    state.pets = state.pets.map((pet) => (pet.id === petAtualizado.id ? petAtualizado : pet))
    state.editingPet = null
    state.message = 'Pet atualizado.'
  } catch {
    state.message = 'Nao foi possivel atualizar o pet.'
  } finally {
    state.loading = false
    render()
  }
}

async function removerPet(petId: number) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Excluindo pet...'
  render()

  try {
    await excluirPet(token, petId)
    state.pets = state.pets.filter((pet) => pet.id !== petId)
    if (state.editingPet?.id === petId) {
      state.editingPet = null
    }
    state.message = 'Pet excluido.'
  } catch {
    state.message = 'Nao foi possivel excluir o pet.'
  } finally {
    state.loading = false
    render()
  }
}

void bootstrap()
