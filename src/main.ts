import './style.css'
import { ApiError, getApiBaseUrl } from './api/client'
import { clearSession, getAccessToken, saveTokens } from './auth/session'
import {
  alterarSenha,
  buscarUsuarioAtual,
  confirmarRecuperacaoSenha,
  login,
  registrar,
  solicitarRecuperacaoSenha,
} from './services/authService'
import { buscarDashboard } from './services/dashboardService'
import { criarFavorito, listarFavoritos, removerFavorito } from './services/favoritoService'
import { atualizarPet, criarPet, excluirPet, listarPets } from './services/petService'
import {
  aprovarSolicitacao,
  cancelarSolicitacao,
  criarSolicitacao,
  listarSolicitacoes,
  recusarSolicitacao,
} from './services/solicitacaoService'
import type {
  DashboardResumo,
  Favorito,
  Pet,
  PetFilters,
  PetPayload,
  SolicitacaoAdocao,
  StatusPet,
  TipoUsuario,
  Usuario,
} from './types/domain'
import { createElement, createText } from './utils/dom'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento #app nao encontrado.')
}

const root = app

type ActiveView = 'pets' | 'solicitacoes' | 'favoritos' | 'painel'
type NavigationItem = [ActiveView, string]

type AppState = {
  usuario: Usuario | null
  activeView: ActiveView
  pets: Pet[]
  solicitacoes: SolicitacaoAdocao[]
  favoritos: Favorito[]
  dashboard: DashboardResumo | null
  petFilters: PetFilters
  editingPet: Pet | null
  resetUid: string
  resetToken: string
  loading: boolean
  message: string
}

const state: AppState = {
  usuario: null,
  activeView: 'pets',
  pets: [],
  solicitacoes: [],
  favoritos: [],
  dashboard: null,
  petFilters: {},
  editingPet: null,
  resetUid: '',
  resetToken: '',
  loading: false,
  message: '',
}

function getInput(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function getFileInput(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name)

  if (field instanceof HTMLInputElement && field.files?.length) {
    return field.files[0]
  }

  return null
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

function createFileField(labelText: string, name: string) {
  const inputId = `field-${name}`
  const label = createElement('label', { htmlFor: inputId, text: labelText })
  const input = createElement('input', { id: inputId, name })
  input.type = 'file'
  input.accept = 'image/*'

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

function getNavigationItems(): NavigationItem[] {
  if (!state.usuario) {
    return [['pets', 'Pets']]
  }

  const items: NavigationItem[] = [
    ['pets', 'Pets'],
    ['solicitacoes', 'Solicitacoes'],
    ['painel', 'Painel'],
  ]

  if (state.usuario.tipo_usuario === 'adotante') {
    items.splice(2, 0, ['favoritos', 'Favoritos'])
  }

  return items
}

function ensureActiveView() {
  const availableViews = getNavigationItems().map(([view]) => view)

  if (!availableViews.includes(state.activeView)) {
    state.activeView = 'pets'
  }
}

function createNavigation() {
  ensureActiveView()

  const nav = createElement('nav', { className: 'app-nav', ariaLabel: 'Navegacao principal' })
  const items = getNavigationItems()

  items.forEach(([view, label]) => {
    const button = createElement('button', {
      className: state.activeView === view ? 'nav-button active' : 'nav-button',
      text: label,
      type: 'button',
    })
    button.addEventListener('click', () => {
      state.activeView = view
      render()
    })
    nav.append(button)
  })

  return nav
}

function createMessage() {
  if (!state.message) {
    return createElement('div', { className: 'message empty' })
  }

  return createElement('div', { className: 'message', text: state.message })
}

function createActionButton(className: string, text: string, type: 'button' | 'submit' = 'button') {
  const button = createElement('button', { className, text, type })
  button.disabled = state.loading

  return button
}

function extractErrorMessage(data: unknown): string | null {
  if (!data) {
    return null
  }

  if (typeof data === 'string') {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(extractErrorMessage).filter(Boolean).join(' ')
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
    const detail = entries.find(([key]) => key === 'detail')

    if (detail) {
      return extractErrorMessage(detail[1])
    }

    return entries
      .map(([key, value]) => {
        const message = extractErrorMessage(value)
        return message ? `${key}: ${message}` : null
      })
      .filter(Boolean)
      .join(' ')
  }

  return null
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return extractErrorMessage(error.data) || fallback
  }

  return fallback
}

function createLoginForm() {
  const form = createElement(
    'form',
    { className: 'auth-form' },
    createElement('h2', { text: 'Entrar' }),
    createField('Email', 'email', 'email'),
    createField('Senha', 'password', 'password'),
    createActionButton('primary-button', 'Entrar', 'submit'),
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
    } catch (error) {
      state.message = getErrorMessage(error, 'Nao foi possivel fazer login.')
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
  form.append(createActionButton('secondary-button', 'Cadastrar', 'submit'))

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
    } catch (error) {
      state.message = getErrorMessage(error, 'Nao foi possivel criar a conta.')
    } finally {
      state.loading = false
      render()
    }
  })

  return form
}

function createPasswordResetArea() {
  const requestForm = createElement(
    'form',
    { className: 'auth-form' },
    createElement('h2', { text: 'Recuperar senha' }),
    createField('Email', 'email', 'email'),
    createActionButton('secondary-button', 'Gerar recuperacao', 'submit'),
  )

  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.loading = true
    state.message = 'Solicitando recuperacao...'
    render()

    try {
      const response = await solicitarRecuperacaoSenha(getInput(requestForm, 'email'))
      state.resetUid = response.uid ?? ''
      state.resetToken = response.token ?? ''
      state.message = state.resetUid && state.resetToken
        ? 'Token de recuperacao gerado em modo DEBUG.'
        : response.detail
    } catch (error) {
      state.message = getErrorMessage(error, 'Nao foi possivel solicitar recuperacao.')
    } finally {
      state.loading = false
      render()
    }
  })

  const confirmForm = createElement(
    'form',
    { className: 'auth-form' },
    createElement('h2', { text: 'Confirmar recuperacao' }),
    createField('UID', 'uid'),
    createField('Token', 'token'),
    createField('Nova senha', 'nova_senha', 'password'),
    createActionButton('secondary-button', 'Redefinir senha', 'submit'),
  )

  setFormValue(confirmForm, 'uid', state.resetUid)
  setFormValue(confirmForm, 'token', state.resetToken)

  confirmForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.loading = true
    state.message = 'Redefinindo senha...'
    render()

    try {
      await confirmarRecuperacaoSenha(
        getInput(confirmForm, 'uid'),
        getInput(confirmForm, 'token'),
        getInput(confirmForm, 'nova_senha'),
      )
      state.resetUid = ''
      state.resetToken = ''
      state.message = 'Senha redefinida. Voce ja pode entrar.'
    } catch (error) {
      state.message = getErrorMessage(error, 'Nao foi possivel redefinir a senha.')
    } finally {
      state.loading = false
      render()
    }
  })

  return createElement('section', { className: 'auth-grid', ariaLabel: 'Recuperacao de senha' }, requestForm, confirmForm)
}

function createChangePasswordForm() {
  const form = createElement(
    'form',
    { className: 'auth-form compact-form' },
    createElement('h2', { text: 'Alterar senha' }),
    createField('Senha atual', 'senha_atual', 'password'),
    createField('Nova senha', 'nova_senha', 'password'),
    createActionButton('secondary-button', 'Alterar senha', 'submit'),
  )

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const token = getAccessToken()
    if (!token) {
      return
    }

    state.loading = true
    state.message = 'Alterando senha...'
    render()

    try {
      await alterarSenha(token, getInput(form, 'senha_atual'), getInput(form, 'nova_senha'))
      state.message = 'Senha alterada com sucesso.'
    } catch (error) {
      state.message = getErrorMessage(error, 'Nao foi possivel alterar a senha.')
    } finally {
      state.loading = false
      render()
    }
  })

  return form
}

function createUserPanel(usuario: Usuario) {
  const logoutButton = createActionButton('secondary-button', 'Sair')
  logoutButton.addEventListener('click', () => {
    clearSession()
    state.usuario = null
    state.pets = []
    state.solicitacoes = []
    state.favoritos = []
    state.dashboard = null
    state.editingPet = null
    state.activeView = 'pets'
    state.message = 'Sessao encerrada.'
    render()
  })

  return createElement(
    'section',
    { className: 'status-panel', ariaLabel: 'Usuario autenticado' },
    createElement('h2', { text: 'Sessao ativa' }),
    createElement('p', { className: 'status-text' }, createText('Usuario: '), createElement('strong', { text: usuario.nome })),
    createElement('p', { className: 'status-text' }, createText('Perfil: '), createElement('strong', { text: usuario.tipo_usuario })),
    createChangePasswordForm(),
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
    createPasswordResetArea(),
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

function resolveMediaUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
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
    createFilterSelect('status', 'Status', [
      ['', 'Todos'],
      ['disponivel', 'Disponivel'],
      ['em_processo', 'Em processo'],
      ['adotado', 'Adotado'],
      ['indisponivel', 'Indisponivel'],
    ]),
    createActionButton('secondary-button', 'Filtrar', 'submit'),
  )
  const clearButton = createActionButton('secondary-button', 'Limpar filtros')
  clearButton.addEventListener('click', () => {
    state.petFilters = {}
    void carregarPets()
  })
  form.append(clearButton)

  setFormValue(form, 'search', state.petFilters.search ?? '')
  setFormValue(form, 'especie', state.petFilters.especie ?? '')
  setFormValue(form, 'porte', state.petFilters.porte ?? '')
  setFormValue(form, 'status', state.petFilters.status ?? '')

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    state.petFilters = {
      search: getInput(form, 'search'),
      especie: getInput(form, 'especie'),
      porte: getInput(form, 'porte'),
      status: getInput(form, 'status') as StatusPet | '',
    }
    await carregarPets()
  })

  return form
}

function createPetPhoto(pet: Pet) {
  if (!pet.foto) {
    return null
  }

  const image = createElement('img', { className: 'pet-photo' })
  image.src = resolveMediaUrl(pet.foto)
  image.alt = `Foto de ${pet.nome}`

  return image
}

function isPetFavorito(petId: number) {
  return state.favoritos.some((favorito) => favorito.pet === petId)
}

function hasSolicitacaoAtiva(petId: number) {
  return state.solicitacoes.some((solicitacao) => (
    solicitacao.pet === petId && solicitacao.status !== 'cancelada' && solicitacao.status !== 'recusada'
  ))
}

function createPetCard(pet: Pet) {
  const children: Node[] = [
    createElement('h3', { text: pet.nome }),
    createElement('p', { className: 'pet-meta' }, createText(`${pet.especie} - ${pet.porte} - ${pet.status}`)),
    createElement('p', { className: 'pet-description', text: pet.descricao || 'Sem descricao cadastrada.' }),
    createElement('p', { className: 'pet-meta' }, createText('Responsavel: '), createElement('strong', { text: pet.responsavel_nome })),
  ]
  const photo = createPetPhoto(pet)

  if (photo) {
    children.unshift(photo)
  }

  if (state.usuario?.tipo_usuario === 'responsavel') {
    const editButton = createActionButton('secondary-button', 'Editar')
    editButton.addEventListener('click', () => {
      state.editingPet = pet
      state.message = `Editando ${pet.nome}.`
      render()
    })

    const deleteButton = createActionButton('danger-button', 'Excluir')
    deleteButton.addEventListener('click', () => {
      void removerPet(pet.id)
    })
    children.push(createElement('div', { className: 'card-actions' }, editButton, deleteButton))
  }

  if (state.usuario?.tipo_usuario === 'adotante' && pet.status === 'disponivel') {
    const petFavoritado = isPetFavorito(pet.id)
    const favoriteButton = createActionButton('secondary-button', petFavoritado ? 'Favoritado' : 'Favoritar')
    favoriteButton.disabled = state.loading || petFavoritado

    if (!petFavoritado) {
      favoriteButton.addEventListener('click', () => {
        void favoritarPet(pet.id)
      })
    }

    const solicitacaoAtiva = hasSolicitacaoAtiva(pet.id)
    const requestButton = createActionButton('primary-button', solicitacaoAtiva ? 'Solicitado' : 'Solicitar adocao')
    requestButton.disabled = state.loading || solicitacaoAtiva

    if (!solicitacaoAtiva) {
      requestButton.addEventListener('click', () => {
        void solicitarAdocao(pet.id)
      })
    }
    children.push(createElement('div', { className: 'card-actions' }, favoriteButton, requestButton))
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
    createFileField('Foto', 'foto'),
    createField('Descricao', 'descricao', 'text', false),
    createActionButton('primary-button', submitText, 'submit'),
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

    const cancelButton = createActionButton('secondary-button', 'Cancelar edicao')
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
      foto: getFileInput(form, 'foto'),
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

  const reloadButton = createActionButton('secondary-button', 'Atualizar pets')
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
    const cancelButton = createActionButton('danger-button', 'Cancelar')
    cancelButton.addEventListener('click', () => {
      void cancelarAdocao(solicitacao.id)
    })
    children.push(createElement('div', { className: 'card-actions' }, cancelButton))
  }

  if (state.usuario?.tipo_usuario === 'responsavel' && solicitacao.status === 'pendente') {
    const approveButton = createActionButton('primary-button', 'Aprovar')
    approveButton.addEventListener('click', () => {
      void decidirSolicitacao(solicitacao.id, 'aprovar')
    })

    const rejectButton = createActionButton('danger-button', 'Recusar')
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

  const reloadButton = createActionButton('secondary-button', 'Atualizar')
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

function createFavoritoCard(favorito: Favorito) {
  const removeButton = createActionButton('danger-button', 'Remover')
  removeButton.addEventListener('click', () => {
    void desfavoritarPet(favorito.id)
  })

  return createElement(
    'article',
    { className: 'pet-card' },
    createElement('h3', { text: favorito.pet_nome }),
    createElement('p', { className: 'pet-meta' }, createText(`Favorito #${favorito.id}`)),
    createElement('div', { className: 'card-actions' }, removeButton),
  )
}

function createFavoritosSection() {
  if (state.usuario?.tipo_usuario !== 'adotante') {
    return createElement('div', { className: 'empty' })
  }

  const reloadButton = createActionButton('secondary-button', 'Atualizar')
  reloadButton.addEventListener('click', () => {
    void carregarFavoritos()
  })

  const list = createElement('div', { className: 'pets-list' })
  if (state.favoritos.length === 0) {
    list.append(createElement('p', { className: 'status-text', text: 'Nenhum favorito encontrado.' }))
  } else {
    state.favoritos.forEach((favorito) => list.append(createFavoritoCard(favorito)))
  }

  return createElement(
    'section',
    { className: 'pets-section', ariaLabel: 'Favoritos' },
    createElement('div', { className: 'section-heading' }, createElement('h2', { text: 'Favoritos' }), reloadButton),
    list,
  )
}

function createMetric(label: string, value: number) {
  return createElement(
    'div',
    { className: 'metric-card' },
    createElement('span', { className: 'metric-value', text: String(value) }),
    createElement('span', { className: 'metric-label', text: label }),
  )
}

function createDashboardSection() {
  if (!state.usuario) {
    return createElement('div', { className: 'empty' })
  }

  const reloadButton = createActionButton('secondary-button', 'Atualizar')
  reloadButton.addEventListener('click', () => {
    void carregarDashboard()
  })

  const metrics = createElement('div', { className: 'metrics-grid' })
  if (!state.dashboard) {
    metrics.append(createElement('p', { className: 'status-text', text: 'Painel ainda nao carregado.' }))
  } else {
    metrics.append(
      createMetric('Pets', state.dashboard.total_pets),
      createMetric('Disponiveis', state.dashboard.pets_disponiveis),
      createMetric('Adotados', state.dashboard.pets_adotados),
      createMetric('Pendentes', state.dashboard.solicitacoes_pendentes),
      createMetric('Aprovadas', state.dashboard.solicitacoes_aprovadas),
      createMetric('Recusadas', state.dashboard.solicitacoes_recusadas),
      createMetric('Favoritos', state.dashboard.favoritos),
    )
  }

  return createElement(
    'section',
    { className: 'pets-section', ariaLabel: 'Painel resumido' },
    createElement('div', { className: 'section-heading' }, createElement('h2', { text: 'Painel' }), reloadButton),
    metrics,
  )
}

function createMainContent() {
  ensureActiveView()

  const apiUrl = createElement('strong', { text: getApiBaseUrl() })
  const sections: Node[] = [
    createElement(
      'section',
      { className: 'status-panel', ariaLabel: 'Status da aplicacao' },
      createElement('h2', { text: 'Conexao da API' }),
      createElement('p', { className: 'status-text' }, createText('API configurada: '), apiUrl),
      createMessage(),
    ),
    createAuthArea(),
  ]

  if (state.activeView === 'pets') {
    sections.push(createPetForm(), createPetsSection())
  }

  if (state.activeView === 'solicitacoes') {
    sections.push(createSolicitacoesSection())
  }

  if (state.activeView === 'favoritos') {
    sections.push(createFavoritosSection())
  }

  if (state.activeView === 'painel') {
    sections.push(createDashboardSection())
  }

  return createElement(
    'main',
    { className: 'app-main' },
    ...sections,
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
  } catch (error) {
    clearSession()
    state.message = getErrorMessage(error, 'Sessao expirada. Entre novamente.')
  } finally {
    state.loading = false
    render()
  }
}

async function carregarDadosPrincipais() {
  await carregarPets()
  await carregarSolicitacoes()
  await carregarFavoritos()
  await carregarDashboard()
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
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel carregar os pets.')
  } finally {
    state.loading = false
    render()
  }
}

async function carregarDashboard() {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Carregando painel...'
  render()

  try {
    state.dashboard = await buscarDashboard(token)
    state.message = 'Painel carregado.'
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel carregar o painel.')
  } finally {
    state.loading = false
    render()
  }
}

async function carregarFavoritos() {
  const token = getAccessToken()
  if (!token || state.usuario?.tipo_usuario !== 'adotante') {
    return
  }

  state.loading = true
  state.message = 'Carregando favoritos...'
  render()

  try {
    state.favoritos = await listarFavoritos(token)
    state.message = 'Favoritos carregados.'
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel carregar os favoritos.')
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
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel carregar as solicitacoes.')
  } finally {
    state.loading = false
    render()
  }
}

async function favoritarPet(petId: number) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Adicionando favorito...'
  render()

  try {
    await criarFavorito(token, petId)
    state.message = 'Pet adicionado aos favoritos.'
    await carregarFavoritos()
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel favoritar o pet.')
  } finally {
    state.loading = false
    render()
  }
}

async function desfavoritarPet(favoritoId: number) {
  const token = getAccessToken()
  if (!token) {
    return
  }

  state.loading = true
  state.message = 'Removendo favorito...'
  render()

  try {
    await removerFavorito(token, favoritoId)
    state.favoritos = state.favoritos.filter((favorito) => favorito.id !== favoritoId)
    state.message = 'Favorito removido.'
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel remover o favorito.')
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
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel cadastrar o pet.')
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
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel enviar a solicitacao.')
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
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel cancelar a solicitacao.')
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
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel atualizar a solicitacao.')
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
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel atualizar o pet.')
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
    await carregarDashboard()
  } catch (error) {
    state.message = getErrorMessage(error, 'Nao foi possivel excluir o pet.')
  } finally {
    state.loading = false
    render()
  }
}

void bootstrap()
