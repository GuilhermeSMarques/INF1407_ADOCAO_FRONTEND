# Adoção de Pets — Frontend

Frontend acadêmico para o sistema de adoção de pets da disciplina INF1407.

Desenvolvido com **Vite**, **TypeScript** e **DOM nativo** (sem frameworks). Consome a API Django REST do repositório `INF1407_ADOCAO_API`.

## Autores

- Guilherme Santos Marques
- Matheus Fonseca Vilella

---

## Tecnologias

- Vite 8
- TypeScript 6
- HTML5 + CSS3 + DOM nativo
- Fetch API (sem bibliotecas HTTP externas)

---

## Pré-requisitos

- Node.js 20+
- npm
- Backend `INF1407_ADOCAO_API` configurado e em execução

---

## Instalação local

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd INF1407_ADOCAO_FRONTEND

# 2. Instale as dependências
npm install

# 3. Configure a URL da API
cp .env.example .env
# Edite VITE_API_URL se o backend não estiver em http://127.0.0.1:8000

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

O frontend ficará disponível em `http://127.0.0.1:5173/`.

---

## Execução com Docker

```bash
# Build com a URL da API embutida no bundle
docker build --build-arg VITE_API_URL=http://seu-backend:8000 -t adocao-frontend .

# Execute o container (porta 80)
docker run -p 3000:80 adocao-frontend
```

Acesse em `http://localhost:3000/`.

---

## Gerar build de produção

```bash
npm run build
# Arquivos gerados em dist/
```

---

## Telas da aplicação

![Tela de login e cadastro](docs/screenshot-login.png)
*Tela de autenticação: login, cadastro e recuperação de senha lado a lado.*

![Lista de pets disponíveis](docs/screenshot-pets.png)
*Pets disponíveis para adoção com filtros por espécie, porte e status.*

![Painel de métricas](docs/screenshot-painel.png)
*Painel com indicadores personalizados por perfil de usuário.*

---

## Manual do usuário

### Cadastro e login

1. Acesse o site.
2. No bloco **Criar conta**, preencha nome, e-mail, telefone, senha e escolha o perfil:
   - **Adotante**: quer adotar um pet.
   - **Responsável**: cadastra pets para adoção.
3. Após criar a conta, use o bloco **Entrar** com e-mail e senha.

### Recuperação de senha

1. No bloco **Recuperar senha**, informe o e-mail cadastrado e clique em **Gerar recuperação**.
2. Em ambiente de desenvolvimento, o `uid` e `token` aparecem na resposta.
3. Cole os valores no bloco **Confirmar recuperação** e defina a nova senha.

### Para adotantes

- **Pets**: veja todos os pets disponíveis. Use os filtros de espécie, porte e status.
- **Favoritar**: clique em **Favoritar** no card do pet para salvá-lo na lista de favoritos.
- **Solicitar adoção**: clique em **Solicitar adoção** para enviar um pedido ao responsável.
- **Solicitações**: acompanhe o status dos seus pedidos (pendente, aprovada, recusada). Pedidos pendentes podem ser cancelados.
- **Favoritos**: gerencie os pets favoritados e remova quando quiser.
- **Painel**: veja suas métricas (pets disponíveis, solicitações, favoritos).

### Para responsáveis

- **Pets**: veja somente seus pets cadastrados.
- **Cadastrar pet**: preencha o formulário com nome, espécie, raça, idade, sexo, porte, status e foto.
- **Editar pet**: clique em **Editar** no card para atualizar os dados.
- **Excluir pet**: clique em **Excluir** e confirme a ação.
- **Solicitações**: veja os pedidos de adoção recebidos para seus pets. Clique em **Aprovar** ou **Recusar**. Ao aprovar, o pet muda automaticamente para "Adotado".
- **Painel**: veja métricas dos seus pets e solicitações.

### Alterar senha

No painel de sessão ativa (após login), use o formulário **Alterar senha** para definir uma nova senha informando a atual.

---

## Estrutura do projeto

```
src/
  api/
    client.ts          # Fetch wrapper com refresh automático de token
  auth/
    session.ts         # Gerência de tokens no localStorage
  services/
    authService.ts     # Login, registro, troca e recuperação de senha
    dashboardService.ts
    favoritoService.ts
    petService.ts
    solicitacaoService.ts
  types/
    domain.ts          # Tipos TypeScript compartilhados
  utils/
    dom.ts             # Helper para criar elementos DOM com segurança
  main.ts              # Estado global, render e toda a lógica de UI
  style.css
```

---

## O que funcionou

- Autenticação JWT com renovação automática de access token via refresh token
- CRUD completo de pets com upload de foto (apenas responsáveis)
- Solicitações de adoção: criação (adotante), aprovação/recusa (responsável), cancelamento (adotante)
- Favoritos por usuário adotante
- Filtros de pets por espécie, porte, sexo, status e busca por nome/raça
- Painel de métricas com dados específicos por perfil
- Recuperação de senha com uid/token em modo DEBUG
- Alteração de senha autenticada
- Sessão persistida no localStorage com restauração automática ao recarregar a página
- Interface responsiva (mobile e desktop)
- Toda a UI construída sem frameworks, apenas DOM nativo e TypeScript

## O que não funcionou

- Envio de e-mail real na recuperação de senha (o backend retorna o token na resposta em DEBUG; em produção seria necessário integrar um provedor SMTP)
