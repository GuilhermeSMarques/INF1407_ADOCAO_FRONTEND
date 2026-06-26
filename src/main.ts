import './style.css'
import { getApiBaseUrl } from './api/client'
import { clearSession, getAccessToken, saveTokens } from './auth/session'
import { buscarUsuarioAtual, login, registrar } from './services/authService'
import { listarPets } from './services/petService'
import type { Pet, PetFilters, TipoUsuario, Usuario } from './types/domain'
import { createElement, createText } from './utils/dom'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento #app nao encontrado.')
}

const root = app

type AppState = {
  usuario: Usuario | null
  pets: Pet[]
  petFilters: PetFilters
  loading: boolean
  message: string
}

const state: AppState = {
  usuario: null,
  pets: [],
  petFilters: {},
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
      await carregarPets()
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
  return createElement(
    'article',
    { className: 'pet-card' },
    createElement('h3', { text: pet.nome }),
    createElement('p', { className: 'pet-meta' }, createText(`${pet.especie} - ${pet.porte} - ${pet.status}`)),
    createElement('p', { className: 'pet-description', text: pet.descricao || 'Sem descricao cadastrada.' }),
    createElement('p', { className: 'pet-meta' }, createText('Responsavel: '), createElement('strong', { text: pet.responsavel_nome })),
  )
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
    createPetsSection(),
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
    await carregarPets()
  } catch {
    clearSession()
    state.message = 'Sessao expirada. Entre novamente.'
  } finally {
    state.loading = false
    render()
  }
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

void bootstrap()
