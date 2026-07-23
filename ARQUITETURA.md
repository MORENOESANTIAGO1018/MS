# Arquitetura — Portal do Cliente (Moreno & Santiago Advogados)

## 1. Visão geral

O Portal do Cliente é uma aplicação web que expõe, de forma segregada e segura, dados
jurídicos de cada cliente do escritório, com sincronização de origem a partir do Notion
(onde a equipe já trabalha) e um módulo de IA (Claude) para apoiar — nunca substituir —
a revisão humana de andamentos processuais.

```
┌──────────────────────────┐        ┌──────────────────────────┐
│   Navegador (cliente)     │        │  Navegador (equipe/admin) │
│  Next.js RSC + Client     │        │  Next.js RSC + Client     │
│  Components               │        │  Components               │
└────────────┬──────────────┘        └────────────┬──────────────┘
             │ HTTPS (cookies httpOnly, sessão Supabase)
             ▼
┌───────────────────────────────────────────────────────────────┐
│                Next.js App Router (Vercel)                     │
│  - Route Handlers (/app/api/**)  — só rodam no servidor        │
│  - Server Actions                                               │
│  - Middleware (auth, headers de segurança, rate limit)          │
│  - lib/server/* (service role, Notion, Claude) — NUNCA          │
│    importado por Client Components                              │
└───────┬───────────────┬───────────────┬────────────────────────┘
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌─────────────┐ ┌───────────────┐
│   Supabase     │ │  Notion API  │ │  Claude API    │
│ Postgres+RLS   │ │ (server-only)│ │ (server-only)  │
│ Auth + Storage │ └─────────────┘ └───────────────┘
└───────┬────────┘
        │ webhooks/cron assinados (HMAC)
        ▼
┌───────────────┐
│      n8n       │  (orquestra sincronização agendada e notificações)
└───────────────┘
```

## 2. Princípios arquiteturais

1. **RLS é a linha de defesa primária.** Toda leitura de dados de cliente passa pelo
   Postgres com Row Level Security ativa. O código de aplicação é uma segunda camada,
   nunca a única.
2. **Segredos nunca chegam ao navegador.** `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN`,
   `ANTHROPIC_API_KEY` e `N8N_WEBHOOK_SECRET` só existem em `lib/server/*`, Route
   Handlers e Server Actions — nunca em componentes `"use client"`, nunca em
   `NEXT_PUBLIC_*`.
3. **Least privilege por papel.** Três papéis: `client`, `staff`, `admin`. Cada tabela
   tem políticas RLS específicas por papel (ver `MODELO-DE-DADOS.md`).
4. **Publicação é um ato humano.** Nenhum dado sincronizado do Notion ou gerado por IA
   fica visível ao cliente sem um campo explícito `is_visible_to_client = true`
   (originado de "Publicar no portal" / "Aprovado para publicação" no Notion, setado
   por um humano).
5. **Auditabilidade total.** Toda leitura sensível (documentos, financeiro) e toda ação
   administrativa gera uma linha em `access_logs` ou `audit_logs`.
6. **Sem dados reais em desenvolvimento.** Seeds e fixtures usam apenas dados fictícios
   (ver `docs/seed-fixtures.md`).

## 3. Camadas da aplicação

### 3.1 Apresentação (Next.js App Router)
- `app/(auth)/*` — login, ativação, recuperação (públicas, mas com rate limit).
- `app/(portal)/*` — área do cliente, protegida por middleware + RLS.
- `app/(admin)/*` — painel administrativo, protegido por middleware + RLS + checagem
  de papel `staff`/`admin`.
- `app/api/*` — Route Handlers para: sincronização Notion, geração de resumo IA,
  emissão de URLs assinadas de storage, webhooks do n8n, ações administrativas que
  precisam de service role (sempre com auditoria).

### 3.2 Domínio (`src/modules/*`)
Código organizado por módulo de negócio, não por tipo técnico:
`auth`, `clients`, `processes`, `hearings`, `deadlines`, `contracts`, `financial`,
`documents`, `messages`, `notifications`, `notion-sync`, `ai-summaries`, `admin`,
`support`. Cada módulo expõe: `queries.ts` (leitura, client-safe), `actions.ts`
(mutações, Server Actions), `types.ts`, `schema.ts` (Zod).

### 3.3 Infraestrutura (`src/lib`)
- `lib/supabase/client.ts` — cliente browser (anon key apenas).
- `lib/supabase/server.ts` — cliente server (contexto de usuário, respeita RLS).
- `lib/server/supabase-admin.ts` — cliente com service role. **Import restrito**:
  ESLint `no-restricted-imports` bloqueia esse arquivo fora de `app/api/**` e
  `src/modules/**/actions.server.ts`.
- `lib/server/notion.ts` — cliente Notion (token server-only).
- `lib/server/claude.ts` — cliente Claude (chave server-only).
- `lib/logger.ts` — logger estruturado com redaction automática de CPF/RG/dados
  bancários (ver `SEGURANCA-E-LGPD.md`).

## 4. Fluxo de autenticação

1. Escritório cria o cliente e um **convite** (nunca cadastro público).
2. Cliente recebe e-mail com link de ativação + **código inicial de ativação** (uso
   único, hash armazenado, expira em 72h).
3. Cliente ativa a conta via Supabase Auth (e-mail + senha ou OTP) — na ativação o
   código é marcado `used_at` e não pode ser reutilizado.
4. Login subsequente: e-mail + senha, com opção de OTP por e-mail para operações
   sensíveis (ex.: liberar novo dispositivo).
5. Middleware do Next.js valida sessão Supabase em toda rota de `(portal)` e `(admin)`;
   expira sessão por inatividade (`SESSION_IDLE_TIMEOUT_MIN`).

## 5. Integração com Notion (server-only)

Descrito em detalhe em `PLANO-DE-IMPLEMENTACAO.md` (Fase 7). Resumo: um job
(`/api/notion/sync`, chamado por n8n ou manualmente pelo admin) lê as data sources do
Notion, filtra por `Publicar no portal` / `Visível no portal` / `Aprovado para
publicação`, mapeia apenas os campos da allowlist (`notion-sync/allowed-fields.ts`) e
faz upsert em Supabase usando `notion_page_id` como chave de deduplicação.

## 6. Integração com Claude (server-only)

`/api/ai/summarize` recebe o texto de um andamento, chama a Claude API e grava o
resultado em `ai_summaries` com `status = 'pending_review'`. Nenhuma rota client-side
tem acesso à chave; nenhuma resposta de IA é copiada para `process_updates` (tabela
visível ao cliente) sem uma ação humana explícita de aprovação (Server Action
`approveAiSummary`).

## 7. Automação (n8n)

n8n não tem acesso direto ao banco. Ele chama endpoints internos autenticados por
`N8N_WEBHOOK_SECRET` (HMAC no header `x-n8n-signature`). Isso mantém o Supabase como
única fonte de verdade de permissões (RLS) e evita duplicar lógica de autorização no
n8n.

## 8. Hospedagem e ambientes

- **Vercel**: Preview (por PR), Staging, Production — cada um com seu próprio projeto
  Supabase (nunca compartilhar banco entre ambientes).
- **Supabase**: projeto de desenvolvimento local (Supabase CLI + Docker) para
  desenvolvimento, projeto de staging e projeto de produção.
- **GitHub**: branch protection na `main`, checks obrigatórios (lint, typecheck,
  testes, build) antes de merge.

## 9. Decisões e trade-offs

| Decisão | Alternativa considerada | Motivo |
|---|---|---|
| RLS como defesa primária | Checagem só na aplicação | Resiliente a bugs de aplicação; padrão recomendado pelo Supabase |
| Service role só em Route Handlers | Service role em Server Components | Reduz superfície de uso indevido; facilita auditoria de onde é usada |
| Notion como fonte editorial, Supabase como fonte de verdade do portal | Ler Notion em tempo real | Performance, resiliência a rate limit, controle de RLS |
| n8n sem acesso direto ao banco | n8n com service role do Supabase | Menor superfície de risco; auditável via HTTP |
| Publicação exige campo humano explícito | IA publica direto | Requisito inegociável de revisão humana |

## 10. Referências cruzadas
- Modelo de dados: `MODELO-DE-DADOS.md`
- Segurança e LGPD: `SEGURANCA-E-LGPD.md`
- Variáveis de ambiente: `VARIAVEIS-DE-AMBIENTE.md`
- Plano de implementação por fase: `PLANO-DE-IMPLEMENTACAO.md`
- Checklist de produção: `CHECKLIST-DE-PRODUCAO.md`
