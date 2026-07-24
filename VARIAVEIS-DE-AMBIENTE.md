# Variáveis de Ambiente — Portal do Cliente

Fonte de verdade executável: `.env.example` (na raiz do projeto Next.js,
`app/.env.example`). Este documento explica cada variável, onde ela pode ser usada e
seu nível de sensibilidade.

> Regra de ouro: se o nome **não** começar com `NEXT_PUBLIC_`, ela nunca deve ser lida
> por um Client Component nem aparecer em código enviado ao navegador. O CI verifica
> isso automaticamente (`scripts/check-server-only-imports.ts`).

## Supabase

| Variável | Sensível | Onde é usada | Descrição |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | não | browser + server | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | não (protegida por RLS) | browser + server | Chave anônima, respeita RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **sim — crítica** | somente `app/api/**`, `lib/server/*` | Ignora RLS; usada só em jobs de sincronização e ações administrativas auditadas |
| `SUPABASE_DB_URL` | sim | scripts de migration/CI | Connection string direta (migrations, testes SQL) |
| `SUPABASE_JWT_SECRET` | sim | server (validação avançada de JWT, se necessário) | |

## Notion

| Variável | Sensível | Onde é usada | Descrição |
|---|---|---|---|
| `NOTION_TOKEN` | **sim — crítica** | somente `app/api/notion/**`, `lib/server/notion.ts` | Token de integração interna do Notion |
| `NOTION_ROOT_PAGE_ID` | não | server | Página raiz "Gestão Jurídica" de onde sincronizamos |
| `NOTION_DB_CLIENTES_ID` ... `NOTION_DB_*_ID` | não | server | IDs das data sources por base (Clientes, Processos, Andamentos, Audiências, Contratos, Financeiro, Documentos, Usuários do Portal) |

## Claude (Anthropic)

| Variável | Sensível | Onde é usada | Descrição |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **sim — crítica** | somente `app/api/ai/**`, `lib/server/claude.ts` | |
| `ANTHROPIC_MODEL` | não | server | Ex.: `claude-sonnet-5` — versão registrada em `ai_summaries.model_version` |

## n8n / Automação

| Variável | Sensível | Onde é usada | Descrição |
|---|---|---|---|
| `N8N_WEBHOOK_SECRET` | **sim** | server (rotas em `app/api/notion/sync`, `app/api/notifications/**`, `app/api/reports/**`, `app/api/maintenance/**`) | Segredo compartilhado que autentica as chamadas n8n → portal (header `x-n8n-secret`, ver `src/lib/server/webhook-auth.ts`) |
| `N8N_BASE_URL` | não (opcional) | server (`src/lib/server/n8n-notify.ts`) | URL da instância n8n. Se ausente, `notifyN8n()` apenas loga e não faz nada (mock silencioso) — nenhuma ação principal falha por causa disso |
| `N8N_TRIGGER_TOKEN` | não (opcional, mas necessário junto com `N8N_BASE_URL` para os eventos transacionais funcionarem de fato) | server | Token que o portal envia (header `x-portal-token`) ao chamar webhooks do n8n (sentido portal → n8n) — ver `automations/n8n/README.md` |

## Autenticação e sessão

| Variável | Sensível | Descrição |
|---|---|---|
| `SESSION_IDLE_TIMEOUT_MIN` | não | Minutos de inatividade até expirar sessão (padrão 30) |
| `ACTIVATION_CODE_TTL_HOURS` | não | Validade do código inicial de ativação (padrão 72) |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | não | Tentativas de login antes de bloquear temporariamente (padrão 5) |
| `AUTH_RATE_LIMIT_WINDOW_MIN` | não | Janela do rate limit (padrão 15) |
| `ACTIVATION_CODE_PEPPER` | **sim** | Pepper adicional ao hash do código de ativação |

## Documentos (Fase 9)

| Variável | Sensível | Descrição |
|---|---|---|
| `MAX_DOCUMENT_SIZE_MB` | não | Tamanho máximo de upload (padrão 20MB) |
| `ALLOWED_DOCUMENT_MIME_TYPES` | não | Lista de MIME types aceitos, separados por vírgula |
| `DOCUMENT_SIGNED_URL_TTL_SECONDS` | não | Validade da URL assinada de download (padrão 300s) |

## Aplicação

| Variável | Sensível | Descrição |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | não | URL pública do portal (usada em links de e-mail) |
| `NEXT_PUBLIC_OFFICE_NAME` | não | Nome do escritório exibido na UI |
| `NEXT_PUBLIC_OFFICE_PHONE` / `_WHATSAPP` / `_EMAIL` / `_ADDRESS` / `_HOURS` | não | Dados de contato exibidos no rodapé/institucional |
| `AUDIT_LOG_RETENTION_DAYS` | não | Retenção de logs (padrão 180) |
| `NODE_ENV` | não | `development` / `test` / `production` |

## Regra para credenciais ausentes durante o desenvolvimento

Quando uma credencial real não está disponível neste ambiente:
1. A variável é declarada em `.env.example` com um comentário explicando o formato
   esperado e um valor de exemplo **não funcional** (ex.: `ntn_xxx...`).
2. O adaptador correspondente (`lib/server/notion.ts`, `lib/server/claude.ts`) detecta
   a ausência da variável em `development`/`test` e usa um **adaptador simulado**
   (`*.mock.ts`) que retorna dados fictícios determinísticos — nunca lança erro
   silencioso nem finge sucesso em produção (`NODE_ENV=production` sem a variável faz
   o build/health-check falhar propositalmente).
3. Nenhuma credencial fictícia é escrita em código-fonte; apenas em `.env.example`
   como texto de exemplo claramente não funcional.

## Checklist de rotação

Ver `CHECKLIST-DE-PRODUCAO.md` — todas as chaves acima devem ter dono, data da última
rotação e procedimento de rotação documentados antes do go-live.
