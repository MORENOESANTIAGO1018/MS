# Modelo de Dados — Portal do Cliente

Todas as tabelas usam `uuid` (default `gen_random_uuid()`) como chave primária, ficam
no schema `public`, têm RLS **habilitada obrigatoriamente** e, quando aplicável,
incluem as colunas padrão:

`id uuid pk`, `client_id uuid fk→clients`, `created_at timestamptz`,
`updated_at timestamptz`, `created_by uuid fk→profiles`, `updated_by uuid fk→profiles`,
`notion_page_id text unique`, `is_visible_to_client boolean default false`,
`archived_at timestamptz null`.

As migrations completas estão em `supabase/migrations/`. Este documento é o mapa de
leitura humana — a fonte de verdade executável são as migrations.

## Papéis (`profiles.role`)
`client` · `staff` · `admin` (enum `user_role`).

## Diagrama de relacionamento (resumo)

```
auth.users 1─1 profiles ──< client_access >── clients
                                                 │
                          ┌──────────────────────┼───────────────────────┐
                          ▼                      ▼                       ▼
                      processes ──< process_updates      contracts   financial_entries
                          │                                                 
                          ├──< hearings
                          ├──< deadlines
                          └──< documents

profiles ──< team_members (staff/advogados)
profiles ──< messages (remetente)
clients  ──< messages
clients  ──< notifications
profiles ──< access_logs
profiles ──< audit_logs
(sistema) notion_sync_logs
process_updates ──< ai_summaries
clients  ──< support_requests
```

## Tabelas

### 1. `profiles`
Espelha `auth.users` (1:1 via `id`). Nunca é criada por cadastro público.
| coluna | tipo | notas |
|---|---|---|
| id | uuid PK, = auth.users.id | |
| role | user_role | client / staff / admin |
| full_name | text | |
| email | text | espelha auth.users.email, único |
| phone | text | |
| is_active | boolean default true | bloqueio de acesso |
| blocked_at | timestamptz | |
| blocked_reason | text | |
| last_login_at | timestamptz | |
| created_at/updated_at | timestamptz | |

### 2. `team_members`
Dados profissionais de staff/advogados (1:1 com `profiles` onde `role in (staff,admin)`).
`profile_id fk`, `oab text`, `position text`, `practice_areas text[]`,
`is_active boolean`.

### 3. `clients`
Entidade "cliente do escritório" (pode ter 0 ou mais `profiles` vinculados via
`client_access`, cobrindo pessoa jurídica com múltiplos contatos).
`full_name`, `document_number_encrypted` (CPF/CNPJ — ver nota de criptografia em
`SEGURANCA-E-LGPD.md`), `document_last4 text` (só os 4 últimos dígitos, para exibição),
`email`, `phone`, `whatsapp`, `status text`, `internal_code text unique`,
`notion_page_id`, `created_at/updated_at`.
**Não** possui `client_id` (ela é a raiz), mas possui `id`, `created_by`,
`notion_page_id`, `archived_at`.

### 4. `client_access`
Junção `profiles ⇄ clients` — controla **quem pode logar como quem**.
`profile_id fk`, `client_id fk`, `access_level text` (`owner`/`viewer`),
`is_active boolean default true`, `revoked_at timestamptz`, `revoked_by uuid`,
`invited_by uuid`, `activation_code_hash text`, `activation_code_expires_at
timestamptz`, `activation_used_at timestamptz`. UNIQUE (`profile_id`, `client_id`).

### 5. `processes`
`client_id fk`, `process_number text`, `court text`, `jurisdiction text`,
`case_class text`, `subject text`, `practice_area text`, `phase text`,
`status text`, `responsible_team_member_id fk→team_members`,
`client_summary text` (linguagem simples — **único texto de resumo exposto**),
`internal_summary text` (nunca exposto — coluna excluída da leitura client no nível de
view, ver §RLS), colunas padrão completas.

### 6. `process_updates` (andamentos)
`process_id fk`, `client_id fk` (desnormalizado para RLS simples e índice),
`update_date date`, `original_text text` (interno), `technical_summary text`
(interno), `plain_language_summary text` (exposto quando publicado), `classification
text`, `possible_deadline date`, `reviewed_by_lawyer boolean default false`,
`published_at timestamptz`, colunas padrão.

### 7. `hearings` (audiências)
`process_id fk`, `client_id fk`, `title text`, `hearing_type text`, `scheduled_at
timestamptz`, `modality text`, `location text`, `access_link text`, `status text`,
`client_notified boolean`, colunas padrão.

### 8. `deadlines` (prazos — **informativos** ao cliente, nunca editáveis por ele)
`process_id fk`, `client_id fk`, `description text`, `due_date date`, `priority text`,
`status text`, colunas padrão. Exposição ao cliente é somente leitura e meramente
informativa (o controle operacional do prazo continua na ferramenta interna/Notion).

### 9. `contracts`
`client_id fk`, `process_id fk null`, `contract_number text`, `service_type text`,
`total_value numeric(12,2)`, `down_payment numeric(12,2)`, `installments_count int`,
`success_fee_description text`, `contract_url text` (Storage path, não URL pública),
`signed_at timestamptz`, `status text`, colunas padrão.

### 10. `financial_entries`
`client_id fk`, `contract_id fk null`, `process_id fk null`, `description text`,
`entry_type text`, `installment_label text`, `amount numeric(12,2)`, `due_date date`,
`paid_at timestamptz`, `status text` CHECK IN
(`pago,pendente,a_vencer,vencido,renegociado,cancelado`), `payment_method text`,
`payment_link text`, `receipt_storage_path text`, colunas padrão.
**Cliente nunca tem `UPDATE`/`INSERT`/`DELETE`** nesta tabela (somente `SELECT`).

### 11. `documents`
`client_id fk`, `process_id fk null`, `name text`, `category text`, `storage_path
text` (bucket privado), `uploaded_by_role text` (`staff`/`client`), `size_bytes
bigint`, `mime_type text`, `is_confidential boolean default false`, `reviewed boolean
default false`, colunas padrão. Upload de cliente cria linha com
`is_visible_to_client = true` e `uploaded_by_role = 'client'` automaticamente (via
trigger), mas **nunca** com `is_confidential = true` (reservado à equipe).

### 12. `messages`
`client_id fk`, `sender_profile_id fk`, `sender_role text` (`client`/`staff`),
`body text`, `read_at timestamptz`, colunas padrão (`is_visible_to_client` sempre
true — canal é bidirecional por natureza).

### 13. `notifications`
`client_id fk null` (broadcast quando null), `profile_id fk null`, `title text`,
`body text`, `category text`, `read_at timestamptz`, colunas padrão.

### 14. `access_logs`
Trilha de acessos a recursos sensíveis (documentos, financeiro, login).
`profile_id fk`, `client_id fk null`, `action text`, `resource_type text`,
`resource_id uuid null`, `ip_hash text` (hash, nunca IP em claro em log de aplicação —
armazenamento bruto fica só no log de borda da Vercel), `user_agent text`,
`created_at timestamptz`. **Somente `INSERT` via service role**; leitura só `admin`.

### 15. `audit_logs`
Trilha de mudanças administrativas (quem aprovou o quê).
`actor_profile_id fk`, `action text`, `entity_type text`, `entity_id uuid`,
`before jsonb`, `after jsonb`, `created_at timestamptz`. `before`/`after` passam por
`redact_sensitive_jsonb()` (ver Segurança) antes de gravar.

### 16. `notion_sync_logs`
`entity_type text`, `notion_page_id text`, `direction text` default `'from_notion'`,
`status text` (`success/error/skipped`), `error_message text`, `payload_hash text`,
`started_at`, `finished_at`, `created_by` (service role marcado como sistema).

### 17. `ai_summaries`
`process_update_id fk`, `client_id fk`, `model text`, `model_version text`,
`prompt_version text`, `technical_summary text`, `plain_language_summary text`,
`classification text`, `possible_deadline date`, `sensitive_flags text[]`,
`status text` CHECK IN (`pending_review,approved,rejected,edited`),
`reviewed_by uuid null`, `reviewed_at timestamptz null`, colunas padrão.
**Nunca** é lida pelo cliente diretamente — só depois de aprovada, seu conteúdo é
copiado por Server Action para `process_updates`.

### 18. `support_requests`
`client_id fk`, `subject text`, `body text`, `status text`, `assigned_to fk null`,
colunas padrão.

## Índices principais
`idx_*_client_id` em toda tabela com `client_id`; `idx_processes_notion_page_id`
(e equivalente nas demais tabelas sincronizadas) como `UNIQUE`; índice composto
`(client_id, due_date)` em `deadlines` e `financial_entries`; `(client_id, created_at
desc)` em `messages`, `notifications`, `process_updates`.

## Constraints e triggers
- `updated_at` mantido por trigger `set_updated_at()` (BEFORE UPDATE) em todas as
  tabelas.
- `financial_entries.status` e `documents.category` validados por `CHECK`.
- Trigger `prevent_client_financial_write()` — defesa em profundidade além do RLS,
  rejeita explicitamente `INSERT/UPDATE/DELETE` em `financial_entries` quando
  `auth.jwt() ->> 'role' = 'client'` mesmo que uma policy futura seja mal configurada.
- Trigger `stamp_document_upload()` — força `is_confidential=false` e
  `is_visible_to_client=true` quando `uploaded_by_role='client'`.

## RLS — resumo por papel
Detalhado nas migrations (`0004_rls_policies.sql` em diante) e nos testes
(`supabase/tests/rls_isolation.sql`). Resumo:

| Tabela | client (SELECT) | client (INSERT) | staff | admin | service_role |
|---|---|---|---|---|---|
| processes | próprio `client_id`, `is_visible_to_client=true` | — | atribuídos | todos | todos |
| process_updates | idem + `published_at is not null` | — | atribuídos | todos | todos |
| hearings/deadlines/contracts | idem | — | atribuídos | todos | todos |
| financial_entries | idem | **negado** | atribuídos (sem delete) | todos | todos |
| documents | idem, exclui `is_confidential=true` | próprios (via função) | atribuídos | todos | todos |
| messages | próprio `client_id` | próprio `client_id` | atribuídos | todos | todos |
| notifications | próprio `profile_id`/`client_id` | — | — | todos | todos |
| access_logs/audit_logs/notion_sync_logs/ai_summaries | **negado** | — | leitura própria ação | todos | todos |
| profiles | próprio registro | — | próprio + clientes atribuídos | todos | todos |

A prova formal de isolamento está em `supabase/tests/rls_isolation.sql`
(dois clientes fictícios, asserts de que client A nunca vê linhas de client B).
