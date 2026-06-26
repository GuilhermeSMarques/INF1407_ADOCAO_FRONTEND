# INF1407_ADOCAO_FRONTEND

Frontend academico para o sistema de adocao de pets da disciplina INF1407.

A aplicacao foi criada com Vite, TypeScript e DOM nativo. Ela consome a API
Django REST do repositorio `INF1407_ADOCAO_API` e implementa os fluxos de
autenticacao, pets, solicitacoes de adocao, favoritos e painel.

## Tecnologias

- Vite
- TypeScript
- HTML, CSS e DOM nativo
- Fetch API

## Requisitos

- Node.js instalado
- npm instalado
- Backend `INF1407_ADOCAO_API` configurado e em execucao

## Configuracao

Crie um arquivo `.env` na raiz do frontend usando o exemplo:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

Quando a variavel nao e informada, o frontend usa `http://127.0.0.1:8000/`
como URL padrao da API.

## Instalar dependencias

```bash
npm install
```

## Executar em desenvolvimento

```bash
npm run dev
```

Por padrao, o Vite disponibiliza a aplicacao em:

```bash
http://127.0.0.1:5173/
```

## Gerar build

```bash
npm run build
```

O comando executa a verificacao TypeScript e gera os arquivos finais em
`dist/`.

## Funcionalidades

- Login com JWT
- Renovacao automatica do token de acesso com refresh token
- Cadastro de usuario adotante ou responsavel
- Consulta do usuario autenticado
- Alteracao de senha
- Recuperacao e confirmacao de senha
- Listagem de pets com filtros
- Cadastro, edicao e exclusao de pets para usuario responsavel
- Criacao e cancelamento de solicitacoes de adocao
- Aprovacao e recusa de solicitacoes para usuario responsavel
- Favoritar e remover pets favoritos para usuario adotante
- Painel com indicadores resumidos

## Estrutura principal

```text
src/
  api/
    client.ts
  auth/
    session.ts
  services/
    authService.ts
    dashboardService.ts
    favoritoService.ts
    petService.ts
    solicitacaoService.ts
  types/
    domain.ts
  utils/
    dom.ts
  main.ts
  style.css
```

## Cuidados de implementacao

O frontend evita montagem de HTML por string. A interface e criada com APIs
seguras do DOM, como `createElement`, `textContent`, `append` e
`replaceChildren`, concentradas principalmente no helper `src/utils/dom.ts`.

## Integracao com a API

Antes de usar o frontend, suba o backend e confirme que a API responde na URL
configurada em `VITE_API_URL`.

Endpoints consumidos pela aplicacao:

- `/api/auth/`
- `/api/pets/`
- `/api/solicitacoes/`
- `/api/favoritos/`
- `/api/dashboard/`
