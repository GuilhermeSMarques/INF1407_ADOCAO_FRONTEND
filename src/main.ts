import './style.css'
import { getApiBaseUrl } from './api/client'
import { clearSession, getAccessToken, saveTokens } from './auth/session'
import { buscarUsuarioAtual, login, registrar } from './services/authService'
import type { TipoUsuario, Usuario } from './types/domain'
import { createElement, createText } from './utils/dom'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento #app nao encontrado.')
}

const root = app

type AppState = {
  usuario: Usuario | null
  loading: boolean
  message: string
}

const state: AppState = {
  usuario: null,
  loading: false,
  message: '',
}

function getInput(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function createField(labelText: string, name: string, type = 'text') {
  const inputId = `field-${name}`
  const label = createElement('label', { htmlFor: inputId, text: labelText })
  const input = createElement('input', {
    id: inputId,
    name,
    placeholder: labelText,
    required: true,
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
  } catch {
    clearSession()
    state.message = 'Sessao expirada. Entre novamente.'
  } finally {
    state.loading = false
    render()
  }
}

void bootstrap()