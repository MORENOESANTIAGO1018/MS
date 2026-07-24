# Segurança e LGPD — Portal do Cliente

## 1. Base legal e princípios (LGPD)

- **Base legal**: execução de contrato (Art. 7º, V) para dados processuais/contratuais/
  financeiros do cliente do escritório; cumprimento de obrigação legal/regulatória para
  guarda documental de processos judiciais (Art. 7º, II); legítimo interesse (Art. 7º,
  IX) apenas para melhoria de segurança (logs de acesso), nunca para marketing sem
  consentimento específico.
- **Minimização**: o portal expõe apenas os campos necessários para o cliente
  acompanhar seu caso. Estratégia jurídica, análise de risco, divisão de honorários e
  observações internas **nunca** são replicadas para as tabelas visíveis ao cliente
  (reforçado pela allowlist de sincronização — ver Fase 7).
- **Titular**: o cliente pode solicitar acesso, correção e exclusão de dados cadastrais
  via `app/(portal)/meus-dados` (correção) e `app/(portal)/suporte` (demais pedidos,
  registrados em `support_requests` e tratados manualmente, pois exclusão de dados
  processuais tem retenção legal obrigatória).
- **Retenção**: dados de processo seguem prazo de guarda de peças jurídicas (mínimo
  legal aplicável); logs de acesso e auditoria são retidos por 6 meses (configurável em
  `AUDIT_LOG_RETENTION_DAYS`) e depois arquivados/anonimizados.
- **Sigilo profissional (Estatuto da OAB, Art. 34/35 e Código de Ética)**: nenhuma
  informação de um cliente é acessível por outro; a equipe só acessa clientes aos quais
  está formalmente atribuída (`client_access` com `access_level = 'staff'`), exceto
  papel `admin`.

## 2. Dados sensíveis — tratamento específico

| Dado | Onde vive | Como é protegido |
|---|---|---|
| CPF/CNPJ | `clients.document_number_encrypted` | Criptografado em repouso via `pgsodium`/`pgcrypto` (`encrypt()` com chave em Vault do Supabase); só os 4 últimos dígitos (`document_last4`) trafegam para a UI |
| RG | Não é persistido em texto livre fora de documentos digitalizados (Storage privado) | Nunca em coluna de texto simples nas tabelas de negócio |
| Dados bancários (comprovantes, links de pagamento) | `financial_entries.receipt_storage_path` | Storage privado + URL assinada de curta duração; nunca URL pública |
| Senhas / OTP | Gerenciados 100% pelo Supabase Auth | Nunca tocados pelo código da aplicação |
| Código de ativação | `client_access.activation_code_hash` | Armazenado com hash (`sha256` + pepper do servidor), nunca em texto puro, expira e é invalidado após uso |

## 3. Logs seguros (regra inegociável #7)

`lib/logger.ts` implementa um logger estruturado (JSON) com uma função
`redact(payload)` aplicada **antes** de qualquer `console.log`/envio a serviço de
observabilidade. A redação:

- Remove por nome de campo (`cpf`, `rg`, `document_number`, `password`, `token`,
  `bank_account`, `iban`, `pix_key`, `receipt`, `otp`, `activation_code`).
- Aplica regex de CPF (`\d{3}\.?\d{3}\.?\d{3}-?\d{2}`) e cartão/conta bancária em
  qualquer string livre, substituindo por `[REDACTED]`.
- `audit_logs.before/after` passam pela mesma função (`redact_sensitive_jsonb`, em
  SQL, espelhando a lista de campos) antes do INSERT — defesa em profundidade mesmo se
  o código da aplicação falhar.
- Testado em `tests/unit/redact.test.ts` com casos adversariais (CPF com e
  sem máscara, aninhado em objetos, em arrays).

## 4. Segredos — onde cada um pode viver

| Segredo | Client (browser) | Server Components | Route Handlers / Server Actions | n8n |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ❌ | ✅ (import restrito) | ❌ |
| `NOTION_TOKEN` | ❌ | ❌ | ✅ | ❌ (n8n chama nosso endpoint, não a Notion direto) |
| `ANTHROPIC_API_KEY` | ❌ | ❌ | ✅ | ❌ |
| `N8N_WEBHOOK_SECRET` | ❌ | ❌ | ✅ (valida o cabeçalho `x-n8n-secret` recebido) | ✅ (envia o cabeçalho) |
| `N8N_BASE_URL` / `N8N_TRIGGER_TOKEN` | ❌ | ❌ | ✅ (`notifyN8n`, sentido portal → n8n, opcional — ver Fase 11) | ✅ (valida `x-portal-token` recebido) |

Reforço automatizado: regra de ESLint `no-restricted-imports` bane
`@/lib/server/*` fora de `app/api/**/route.ts` e `src/**/*actions.server.ts`;
CI roda `scripts/check-server-only-imports.ts` que falha o build se detectar o import
fora desses locais (ou dentro de um Client Component), e falha também se
`process.env.<SEGREDO>` for referenciado fora deles.

## 5. Cabeçalhos e transporte

- **HTTPS obrigatório** (Vercel força TLS; HSTS com `max-age=63072000; includeSubDomains; preload`).
- **CSP** (ver `next.config.mjs`): `default-src 'self'`; `img-src 'self' data:
  https://*.supabase.co`; `connect-src 'self'` (o navegador nunca fala diretamente com
  Supabase/Notion/Claude — toda chamada externa é mediada pelo servidor, então não há
  necessidade de abrir `connect-src` para esses domínios); sem `unsafe-inline` para
  scripts; `frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` restritiva.
- Cookies de sessão: `httpOnly`, `secure`, `sameSite=lax` (padrão do
  `@supabase/ssr`), nunca acessíveis via `document.cookie`.

## 6. Proteções de aplicação

- **CSRF**: Server Actions do Next.js já validam origem por padrão; Route Handlers de
  mutação exigem cabeçalho `Origin`/`Sec-Fetch-Site` validado + (para webhooks n8n)
  HMAC.
- **Injeção**: 100% das queries via `supabase-js`/`postgrest` (parametrizado) ou
  `pg` com prepared statements nos scripts administrativos; zero SQL concatenado com
  input do usuário.
- **Validação de entrada**: todo Server Action/Route Handler valida `body`/`params`
  com **Zod** antes de tocar no banco (`schema.ts` por módulo).
- **Rate limiting**: tabela própria `auth_rate_limits` no Postgres (não em memória —
  funções serverless da Vercel não compartilham memória entre invocações), verificada
  em `checkRateLimit()` antes de login, ativação de conta e recuperação de senha.
  Chaveado por e-mail/identificador do alvo (não por IP), então não pode ser burlado
  falsificando `X-Forwarded-For`.
- **Enumeração de usuários**: mensagens de erro de login/recuperação são genéricas
  (“Se o e-mail existir, enviaremos instruções”), independente do e-mail existir ou não.
- **URLs assinadas**: todo acesso a arquivo do Storage (documentos e comprovantes
  financeiros) usa `createSignedUrl(path, DOCUMENT_SIGNED_URL_TTL_SECONDS)` (padrão 5
  minutos), nunca bucket público — gerada sob demanda a partir de um clique explícito
  do usuário, sempre registrando `access_logs`.
- **Dado sensível fora do portal**: CPF/RG não são exibidos em nenhuma tela do portal
  do cliente hoje (`document_last4` existe no schema para uma futura exibição parcial
  controlada, mas não está conectado a nenhuma UI ainda) — a forma mais segura de tratar
  um dado é não expô-lo quando não há necessidade funcional comprovada.

## 7. Regra de publicação humana (inegociável #10)

- Notion → `notion_sync_logs`/tabelas internas: sync grava `is_visible_to_client`
  **apenas** copiando o valor de "Publicar no portal"/"Visível no portal" já definido
  por humano no Notion — o sync nunca decide isso sozinho.
- Claude → `ai_summaries.status = 'pending_review'` sempre; a cópia para
  `process_updates` (tabela lida pelo cliente) só ocorre via Server Action
  `approveAiSummary(id)` executada por um `profile.role in (staff, admin)`
  autenticado, que grava `reviewed_by`/`reviewed_at` e um registro em `audit_logs`.

## 8. Resposta a incidentes (resumo — detalhado em `docs/manual-recuperacao.md`)

1. Revogar sessões afetadas (`admin > usuários > revogar sessões`, chama
   `supabase.auth.admin.signOut`).
2. Rotacionar segredo comprometido (Vercel + Supabase + Notion + Anthropic).
3. Consultar `audit_logs`/`access_logs` para escopo do incidente.
4. Notificar ANPD/titulares se caracterizado risco relevante (Art. 48 LGPD), com
   apoio do encarregado de dados do escritório.

## 9. `SECURITY-REPORT.md`

Um relatório específico de segurança (achados, mitigações e resultado de
`npm audit`) é gerado na Fase 13 e mantido em `SECURITY-REPORT.md`.
