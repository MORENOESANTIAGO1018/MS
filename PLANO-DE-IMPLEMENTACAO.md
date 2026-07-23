# Plano de Implementação — Portal do Cliente

Este plano detalha, fase a fase, os entregáveis técnicos concretos. Cada fase termina
com: revisão de código → testes → correções → documentação → commit.

## Fase 1 — Planejamento (este conjunto de documentos)
`ARQUITETURA.md`, `PLANO-DE-IMPLEMENTACAO.md`, `MODELO-DE-DADOS.md`,
`SEGURANCA-E-LGPD.md`, `VARIAVEIS-DE-AMBIENTE.md`, `CHECKLIST-DE-PRODUCAO.md`.

## Fase 2 — Estrutura do projeto
- `create-next-app` (App Router, TypeScript, Tailwind, ESLint) em `app/`.
- Prettier + `eslint-config-prettier` + regra `no-restricted-imports` para segredos.
- Estrutura de pastas por módulo (`src/modules/*`), `src/lib`, `src/components/ui`.
- Zod para validação; `lib/logger.ts` com redaction; `app/error.tsx`,
  `app/global-error.tsx`, boundary de erro por rota.
- Vitest (unitário/integração) + Testing Library + Playwright (E2E) configurados.
- `package.json` com scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`,
  `test:e2e`, `format`.

## Fase 3 — Banco de dados
- `supabase/migrations/0001_extensions_and_enums.sql`
- `supabase/migrations/0002_core_tables.sql` (profiles, team_members, clients,
  client_access)
- `supabase/migrations/0003_domain_tables.sql` (processes … audit_logs, 18 tabelas)
- `supabase/migrations/0004_indexes_and_triggers.sql` (índices + `set_updated_at`,
  `prevent_client_financial_write`, `stamp_document_upload`,
  `prevent_profile_privilege_escalation`)
- `supabase/migrations/0005_auth_helper_functions.sql` (`is_admin`,
  `is_staff_or_admin`, `has_client_access`, `current_profile_role` — SECURITY DEFINER)
- `supabase/migrations/0006_rls_policies.sql` — RLS habilitada e políticas em todas as
  18 tabelas
- `supabase/migrations/0007_functions_and_safeguards.sql` (`redact_sensitive_jsonb` +
  trigger em `audit_logs`, `consume_activation_code` atômico)
- `supabase/seed/seed_fictitious.sql` — dados fictícios de desenvolvimento (2 clientes,
  staff, admin, dados publicados e não publicados)
- `supabase/tests/rls_isolation.sql` + `supabase/tests/run-local.sh` — prova executável
  de isolamento entre clientes (`npm run db:test:rls`), validada neste ambiente contra
  PostgreSQL local com `supabase/local-dev/bootstrap_local_auth_stub.sql` simulando
  `auth.uid()`/papéis do Supabase (nunca rodar o stub contra um projeto Supabase real)

## Fase 4 — Autenticação
- `src/modules/auth/*`: `sendInvite`, `activateAccount`, `login`, `requestOtp`,
  `verifyOtp`, `logout`, `requestPasswordReset`, `blockUser`.
- `middleware.ts`: refresh de sessão Supabase, proteção de `(portal)`/`(admin)`,
  cabeçalhos de segurança, rate limiting básico.
- `app/(auth)/entrar`, `app/(auth)/ativar`, `app/(auth)/recuperar`.
- Tabela `client_access` controla código de ativação de uso único.

## Fase 5 — Portal do cliente
Rotas em `app/(portal)/*`: `painel`, `processos`, `processos/[id]`, `andamentos`,
`audiencias`, `prazos`, `documentos`, `contratos`, `financeiro`, `mensagens`,
`notificacoes`, `meus-dados`, `suporte`, e páginas públicas
`app/(institucional)/privacidade`, `app/(institucional)/termos`.

## Fase 6 — Painel administrativo
Rotas sob o prefixo real `/admin/*` (não um route group — necessário para o
middleware distinguir área administrativa de área do cliente por prefixo de path,
já que vários nomes de página se repetem entre os dois, ex. "processos"):
`app/admin/dashboard`, `app/admin/clientes`, `app/admin/processos`,
`app/admin/andamentos`, `app/admin/audiencias`, `app/admin/prazos`,
`app/admin/contratos`, `app/admin/financeiro`, `app/admin/documentos`,
`app/admin/mensagens`, `app/admin/usuarios`, `app/admin/permissoes`,
`app/admin/relatorios`, `app/admin/logs`, `app/admin/configuracoes`,
`app/admin/sincronizacao`, `app/admin/resumos-ia`.

## Fase 7 — Integração Notion
`src/modules/notion-sync/*`: `client.ts` (wrapper server-only), `allowed-fields.ts`
(allowlist explícita por entidade), `mappers/*.ts`, `sync.ts` (orquestrador
incremental por `last_edited_time`), `app/api/notion/sync/route.ts` (manual + n8n),
tabela `notion_sync_logs`, tela admin `sincronizacao`.

## Fase 8 — Financeiro
`src/modules/financial/*`: queries somente leitura para cliente, geração de extrato
PDF (`@react-pdf/renderer` ou `pdf-lib`), URLs assinadas de comprovantes, notificação
de vencimento (integrada ao n8n workflow #7/#8).

## Fase 9 — Documentos
`src/modules/documents/*`: upload (Supabase Storage, bucket privado por cliente),
validação de tamanho/extensão (`ALLOWED_DOCUMENT_MIME_TYPES`,
`MAX_DOCUMENT_SIZE_MB`), fluxo preparado para varredura antivírus
(`scanDocument()` adaptador — real via ClamAV/serviço externo quando disponível,
simulado em dev), download via URL assinada, `access_logs` em todo download.

## Fase 10 — IA (Claude)
`src/modules/ai-summaries/*`: `summarizeProcessUpdate()` server-only, saída
estruturada validada por Zod (`AiSummarySchema`), grava em `ai_summaries` com
`status='pending_review'`; Server Action `approveAiSummary` (staff/admin) copia para
`process_updates` só após aprovação.

## Fase 11 — Automações n8n
`automations/n8n/*.json` — 12 workflows (ver Fase 11 do prompt), cada um documentado
em `automations/n8n/README.md` com variáveis de ambiente esperadas no n8n.

## Fase 12 — Design
`src/styles/theme` (paleta jurídica sóbria), `src/components/ui/*` (Button, Card,
Badge, Table, Modal, EmptyState), layout responsivo, `app/(institucional)/*` com
placeholders de logotipo/contato via `NEXT_PUBLIC_OFFICE_*`.

## Fase 13 — Segurança
`middleware.ts` (headers, CSP, rate limit), `next.config.mjs` (headers estáticos),
`scripts/check-server-only-imports.ts`, `SECURITY-REPORT.md`.

## Fase 14 — Testes
`tests/unit/*`, `tests/integration/*`, `tests/e2e/*`, `supabase/tests/rls_isolation.sql`.
Critério de saída: nenhum teste crítico falhando (ver `CHECKLIST-DE-PRODUCAO.md`).

## Fase 15 — Publicação
`vercel.json`, `.github/workflows/ci.yml`, `docs/manual-instalacao.md`,
`docs/manual-operacao.md`, `docs/manual-recuperacao.md`,
`app/(system)/manutencao`, `app/not-found.tsx`.

## Ordem de execução e dependências
Fases 1→4 são sequenciais e bloqueantes. Fases 5–13 têm dependências parciais entre si
(portal e admin dependem de 3+4; Notion/IA dependem de 3; Financeiro/Documentos
dependem de 3+9/8) mas serão implementadas em sequência simples nesta execução para
manter rastreabilidade de commits. Fase 14 valida todas as anteriores. Fase 15 fecha o
projeto.

## Definição de "pronto" por fase
1. Compila (`typecheck`) sem erros novos.
2. `lint` sem erros novos (avisos pré-existentes documentados).
3. Testes da fase (unitários/integração/E2E/SQL) executando e passando.
4. Documentação atualizada (este arquivo + docs específicos da fase, se houver).
5. Commit com mensagem descritiva referenciando a fase.
