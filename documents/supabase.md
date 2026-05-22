# Supabase — Sincronia Calendar

## Resumo

Integração com Supabase como banco de dados persistente, substituindo o localStorage como fonte primária de dados. O app mantém um modo híbrido: salva tanto no Supabase quanto no localStorage, com fallback offline.

## Estrutura do Banco

### Tabela `categories`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `text` (PK) | Identificador único (ex: `"trabalho"`) |
| `name` | `text not null` | Nome da categoria |
| `color_code` | `text not null` | Cor hexadecimal (ex: `"#3b82f6"`) |
| `subcategories` | `jsonb` | Array de subcategorias: `[{ id, name }]` |

### Tabela `events`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `bigint` (PK, identity) | Gerado automaticamente |
| `title` | `text not null` | Título do evento |
| `description` | `text default ''` | Descrição |
| `date` | `date not null` | Data do evento |
| `time_start` | `time not null` | Horário início |
| `time_end` | `time not null` | Horário fim |
| `category_id` | `text not null` | FK → categories.id |
| `subcategory_id` | `text default ''` | ID da subcategoria |
| `recurrence` | `jsonb` | Configuração de recorrência |
| `exceptions` | `jsonb default '{}'` | Exceções de recorrência |
| `reminder` | `jsonb` | Configuração de lembrete |
| `created_at` | `timestamptz default now()` | Timestamp de criação |

### RLS (Row Level Security)

Políticas abertas (app pessoal):

```sql
alter table events enable row level security;
alter table categories enable row level security;
create policy "all_access_events" on events for all using (true) with check (true);
create policy "all_access_categories" on categories for all using (true) with check (true);
```

## SQL de Setup

Executar no [SQL Editor do Supabase](https://supabase.com/dashboard/project/_/sql/new):

```sql
create table categories (
  id text primary key,
  name text not null,
  color_code text not null,
  subcategories jsonb default '[]'::jsonb
);

create table events (
  id bigint primary key generated always as identity,
  title text not null,
  description text default '',
  date date not null,
  time_start time not null,
  time_end time not null,
  category_id text not null references categories(id),
  subcategory_id text default '',
  recurrence jsonb,
  exceptions jsonb default '{}'::jsonb,
  reminder jsonb,
  created_at timestamptz default now()
);

alter table events enable row level security;
alter table categories enable row level security;
create policy "all_access_events" on events for all using (true) with check (true);
create policy "all_access_categories" on categories for all using (true) with check (true);

insert into categories (id, name, color_code, subcategories) values
  ('pessoal', 'Pessoal', '#10b981',
    '[{"id": "saude", "name": "Saúde"}, {"id": "lazer", "name": "Lazer"}, {"id": "financas", "name": "Finanças"}]'),
  ('trabalho', 'Trabalho', '#3b82f6',
    '[{"id": "reuniao", "name": "Reunião"}, {"id": "projeto", "name": "Projeto"}, {"id": "desenvolvimento", "name": "Desenvolvimento"}]');
```

## Variáveis de Ambiente

Criar no Netlify Dashboard (**Site settings → Environment variables**) ou no arquivo `.env` local:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave_aqui
```

> **Importante:** O Netlify usa a nova chave **publishable** (`sb_publishable_xxx`), não a `anon` legada.

## Como obter as credenciais

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione o projeto
3. Vá em **Settings → API** ou clique em "Connect" no overview
4. Copie a **Project URL** e a **Publishable key**

## Arquivos do Projeto

| Arquivo | Função |
|---|---|
| `src/lib/supabaseClient.js` | Inicializa o cliente Supabase |
| `src/services/db.js` | Funções CRUD (load/save events e categories) |
| `src/App.vue` | Integração híbrida localStorage + Supabase |

## Testes

Os testes (Playwright) continuam usando localStorage para manter a independência do backend. Nenhuma alteração foi feita nos specs de teste.

---

# O que eu devo fazer

Você não precisa entender de Supabase — só seguir estes passos na ordem exata.

## Passo 1 — Criar uma conta no Supabase

1. Abra o site **https://supabase.com/dashboard** no seu navegador
2. Clique em **"Sign in with GitHub"** (use a mesma conta do GitHub que você já tem)
3. Autorize o login se o GitHub pedir permissão
4. Pronto — você está no dashboard do Supabase

## Passo 2 — Criar o projeto

1. No dashboard, clique no botão **"New project"** (ou **"Create a project"** — fica no canto superior direito)
2. Preencha o formulário:
   - **Name:** `my-calendar` (pode ser qualquer nome)
   - **Database Password:** crie uma senha segura **e anote em algum lugar** (você vai precisar depois)
   - **Region:** escolha **South America (São Paulo)** — `sa-south-1` — para menor latência
   - **Pricing Plan:** escolha **Free** (é gratuito, sem necessidade de cartão de crédito)
3. Clique em **"Create new project"**
4. **Aguarde de 2 a 5 minutos** enquanto o Supabase cria o banco de dados (aparece uma tela com "Initializing..." e "Setting up project...")
5. Quando terminar, você será levado à página inicial ("Home") do seu projeto

## Passo 3 — Criar as tabelas no banco

1. No menu lateral esquerdo (ícones), clique no bloco **"SQL Editor"** (ícone de um bloco de notas com um raio)
2. Clique no botão **"New query"**
3. A página mostra um editor de texto em branco. **Apague qualquer texto que já estiver lá**
4. Copie o código SQL abaixo:

```sql
create table categories (
  id text primary key,
  name text not null,
  color_code text not null,
  subcategories jsonb default '[]'::jsonb
);

create table events (
  id bigint primary key generated always as identity,
  title text not null,
  description text default '',
  date date not null,
  time_start time not null,
  time_end time not null,
  category_id text not null references categories(id),
  subcategory_id text default '',
  recurrence jsonb,
  exceptions jsonb default '{}'::jsonb,
  reminder jsonb,
  created_at timestamptz default now()
);

alter table events enable row level security;
alter table categories enable row level security;
create policy "all_access_events" on events for all using (true) with check (true);
create policy "all_access_categories" on categories for all using (true) with check (true);

insert into categories (id, name, color_code, subcategories) values
  ('pessoal', 'Pessoal', '#10b981',
    '[{"id": "saude", "name": "Saúde"}, {"id": "lazer", "name": "Lazer"}, {"id": "financas", "name": "Finanças"}]'),
  ('trabalho', 'Trabalho', '#3b82f6',
    '[{"id": "reuniao", "name": "Reunião"}, {"id": "projeto", "name": "Projeto"}, {"id": "desenvolvimento", "name": "Desenvolvimento"}]');
```

5. **Cole o código** no editor (Ctrl+V)
6. Clique no botão **"Run"** (seta ▶ roxa no canto superior direito)
7. **Aguarde** a mensagem verde **"Success. No rows returned"** — isso significa que deu certo

## Passo 4 — Pegar as credenciais (URL e chave)

1. No menu lateral esquerdo, clique em **"Connect"** (ou **"Project Settings" → "API"**, dependendo da versão)
2. Você vai ver duas informações importantes:
   - **Project URL** — uma URL do tipo `https://xxxxxxxxxxxxxx.supabase.co`
   - **Publishable key** — uma chave começando com `sb_publishable_` (se não aparecer a publishable key, clique no botão **"Create new API key"** e selecione "Publishable key")
3. **Copie a Project URL e a Publishable key** para um bloco de notas — você vai usá-las no Netlify

> **Atenção:** use a **Publishable key** (não a `anon` key). A `anon` key antiga funciona até o final de 2026, mas a publishable key é a recomendada e pode ser usada com segurança no frontend.

## Passo 5 — Fazer deploy no Netlify

### 5.1 — Primeiro, faça push do código atualizado para o GitHub

No terminal (PowerShell), execute:

```bash
git add -A
git commit -m "feat: integração Supabase + deploy Netlify"
git push origin main
```

### 5.2 — Criar conta no Netlify

1. Abra **https://app.netlify.com** no navegador
2. Clique em **"Sign in with GitHub"** (mesma conta)
3. Autorize o login

### 5.3 — Importar o repositório

1. No dashboard do Netlify, clique em **"Add new site"** → **"Import an existing project"**
2. Você verá a lista de repositórios do GitHub. Clique em **"Breno0604/my-calendar"** (ou o nome do seu repositório)
3. **Não mude nada nas configurações** — o Netlify já detecta automaticamente:
   - **Branch to deploy:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Role para baixo até a seção **"Environment variables"**
5. Clique em **"Add environment variable"** (adicione uma de cada vez):
   - Primeira variável:
     - **Name:** `VITE_SUPABASE_URL`
     - **Value:** cole a Project URL que você copiou do Supabase
   - Segunda variável:
     - **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY`
     - **Value:** cole a Publishable key do Supabase
6. Clique em **"Deploy my-calendar"**
7. **Aguarde de 2 a 3 minutos** enquanto o Netlify faz o build e o deploy
8. Quando terminar, você verá uma mensagem "Site is live" com um link `.netlify.app`
9. **Pronto!** Seu site está no ar. Qualquer push futuro na branch `main` do GitHub fará deploy automático.

## Passo 6 — Verificar se está funcionando

1. Abra o link do Netlify (algo como `https://my-calendar-xxxxx.netlify.app`)
2. O calendário deve carregar normalmente
3. Crie um evento novo ou edite uma categoria
4. **Recarregue a página (F5)** — os dados devem continuar lá (agora salvos no Supabase)

Se algo der errado, o app automaticamente usa o localStorage como fallback — seus dados locais não serão perdidos.

## Dúvidas comuns

**"Preciso colocar cartão de crédito?"**
— Não. O plano Free do Supabase é suficiente para um app pessoal.

**"O que acontece se o Supabase ficar offline?"**
— O app continua funcionando com localStorage. Quando o Supabase voltar, os dados serão sincronizados.

**"Como acesso os dados salvos no banco?"**
— No Supabase Dashboard, use o menu **"Table Editor"** (ícone de planilha) para visualizar e editar as tabelas como se fosse uma planilha do Excel.

**"Preciso instalar algo no meu computador?"**
— Não. Tudo é feito pelo navegador nos sites do Supabase e Netlify.
