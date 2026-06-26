import './style.css'
import { getApiBaseUrl } from './api/client'
import { createElement, createText } from './utils/dom'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento #app nao encontrado.')
}

function createHeader() {
  const title = createElement('h1', { text: 'Adocao de Pets' })
  const subtitle = createElement('p', {
    className: 'app-subtitle',
    text: 'Painel inicial da plataforma academica de adocao.',
  })

  const header = createElement('header', { className: 'app-header' }, title, subtitle)
  return header
}

function createNavigation() {
  const nav = createElement('nav', { className: 'app-nav', ariaLabel: 'Navegacao principal' })
  const labels = ['Pets', 'Minhas solicitacoes', 'Favoritos', 'Painel']

  labels.forEach((label, index) => {
    const button = createElement('button', {
      className: index === 0 ? 'nav-button active' : 'nav-button',
      text: label,
      type: 'button',
    })
    nav.append(button)
  })

  return nav
}

function createStatusPanel() {
  const apiUrl = createElement('strong', { text: getApiBaseUrl() })
  const apiText = createElement('p', { className: 'status-text' }, createText('API configurada: '), apiUrl)

  return createElement(
    'section',
    { className: 'status-panel', ariaLabel: 'Status da aplicacao' },
    createElement('h2', { text: 'Preparacao do frontend' }),
    apiText,
    createElement('p', {
      className: 'status-text',
      text: 'Estrutura inicial criada sem innerHTML e pronta para consumir a API.',
    }),
  )
}

function createMainContent() {
  return createElement(
    'main',
    { className: 'app-main' },
    createStatusPanel(),
    createElement(
      'section',
      { className: 'empty-state', ariaLabel: 'Proximas telas' },
      createElement('h2', { text: 'Proximos passos' }),
      createElement('p', {
        text: 'As proximas telas vao conectar login, pets, solicitacoes, favoritos e painel.',
      }),
    ),
  )
}

app.replaceChildren(createHeader(), createNavigation(), createMainContent())
