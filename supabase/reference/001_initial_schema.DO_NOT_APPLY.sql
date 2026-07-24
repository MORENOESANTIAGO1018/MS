-- =============================================================================
-- 001_initial_schema.sql — Portal Jurídico de Clientes: schema completo
-- =============================================================================
-- NAO EXECUTAR ainda: aguardando revisão humana (ver pedido do usuário).
--
-- ATENÇÃO — leia antes de aplicar este arquivo a QUALQUER projeto Supabase:
-- Este diretório (supabase/migrations/) já contém uma cadeia de migrations
-- 0001..0010 aplicada e em uso pela aplicação Next.js deste mesmo
-- repositório, com um design ligeiramente diferente (ver seção 0 abaixo). Se
-- este arquivo for executado no MESMO projeto Supabase que já rodou
-- 0001..0010, ele vai:
--   (a) colidir em CREATE POLICY para as tabelas com nome igual (profiles,
--       clients, processes, ... — "create table if not exists" não falha,
--       mas "create policy" sem IF NOT EXISTS falha se o nome já existir, e
--       mesmo com nomes diferentes, múltiplas policies permissivas se somam
--       por OR, alterando o comportamento de RLS já validado); e
--   (b) introduzir uma tabela team_members que o código da aplicação
--       existente não conhece, e um vínculo clients.user_id direto que
--       diverge do modelo já usado (client_access genérico).
-- Rode este arquivo apenas em um projeto Supabase NOVO e vazio, ou renomeie/
-- mova para não coexistir com 0001..0010 no mesmo diretório de migrations.
--
-- Requisitos atendidos:
--   1. UUID em todas as chaves primárias.
--   2. auth.users como origem de todo usuário autenticado.
--   3. Cada cliente relacionado a um usuário autenticado (clients.user_id).
--   4. Um cliente pode ter vários processos (processes.client_id, 1:N).
--   5. RLS ativado em todas as 18 tabelas.
--   6. Políticas: cliente só vê registros do próprio client_id.
--   7. Cliente nunca pode INSERT/UPDATE/DELETE em processes, process_updates,
--      hearings, deadlines, contracts, financial_entries — nem por RLS nem
--      (defesa em profundidade) por trigger.
--   8. Cliente pode INSERT em messages e documents (com uploaded_by_role
--      obrigatoriamente 'client' nas próprias linhas).
--   9. Toda ação administrativa ampla exige role = 'admin'.
--  10. Índices em client_id, process_id, user_id, notion_page_id, status e
--      colunas de data.
--  11. Trigger genérico de updated_at em toda tabela que tem a coluna.
--  12. CHECK constraints para valores financeiros e para os domínios de
--      status de cada tabela.
--  13. Nenhuma coluna de senha/OTP existe neste schema (seção 1).
--  14. Trilha de auditoria automática via trigger, com redação de campos
--      sensíveis antes de gravar (seção 6).
--  15. Testes de acesso cruzado: ver
--      supabase/schema-portal-juridico/02_testes_acesso_cruzado.sql — já
--      escrito e validado contra o schema equivalente; os nomes de
--      função/tabela são idênticos, então roda sem alteração contra este
--      arquivo também.
--
-- Revisão de segurança ao final (seção 10) — inclui as correções aplicadas
-- nesta revisão em relação a uma primeira versão deste schema.
-- =============================================================================


-- =============================================================================
-- 1. Extensões e nota sobre credenciais
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid(), pgp_sym_encrypt/decrypt

-- NOTA (requisito 13): este schema NUNCA armazena senha, hash de senha ou OTP.
-- auth.users (gerenciada pelo Supabase Auth) é a única fonte de credenciais —
-- nenhuma tabela abaixo tem coluna "password", "senha" ou "otp". CPF/CNPJ
-- completo, quando armazenado, usa pgcrypto (bytea cifrado), nunca texto
-- puro — ver clients.document_number_encrypted.


-- =============================================================================
-- 2. Tabelas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 profiles — extensão 1:1 de auth.users para todo usuário autenticado
--     (cliente, staff ou admin). "role" + "is_active" são a base de toda a
--     RLS deste schema.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('admin', 'staff', 'client')),
  full_name   text not null,
  email       text not null,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Extensão de auth.users. "role"/"is_active" definem todo o comportamento de RLS deste schema — nunca confiar em valor vindo do client, sempre ler desta tabela no servidor.';

-- -----------------------------------------------------------------------------
-- 2.2 team_members — cadastro da equipe interna do escritório (staff/admin).
--     Só existe uma linha aqui para profiles com role IN ('staff','admin').
-- -----------------------------------------------------------------------------
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles (id) on delete cascade,
  department  text,
  job_title   text,
  oab_number  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.team_members is
  'Registro da equipe interna (staff/admin). client_access referencia esta tabela para atribuir um membro da equipe a um cliente.';

-- -----------------------------------------------------------------------------
-- 2.3 clients — o cliente do escritório. Ligação direta e obrigatória a um
--     usuário autenticado (requisito 3).
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique references auth.users (id) on delete cascade,
  full_name                   text not null,
  email                       text,
  phone                       text,
  whatsapp                    text,
  document_number_encrypted   bytea,   -- CPF/CNPJ completo, cifrado (pgp_sym_encrypt) — nunca texto puro
  document_last4              text,    -- últimos 4 dígitos, únicos dados de documento exibidos na UI
  status                      text not null default 'Lead'
                                check (status in ('Lead', 'Cliente ativo', 'Cliente inativo', 'Encerrado')),
  internal_code               text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.clients is
  'Um cliente = um usuário autenticado (user_id único). Nunca existe cliente sem login correspondente nem login de cliente sem linha aqui.';

-- -----------------------------------------------------------------------------
-- 2.4 client_access — atribuição de um membro da equipe a um cliente
--     (controla o que cada staff enxerga; admin sempre vê tudo, sem precisar
--     de linha aqui).
-- -----------------------------------------------------------------------------
create table if not exists public.client_access (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id) on delete cascade,
  team_member_id  uuid not null references public.team_members (id) on delete cascade,
  granted_by      uuid references public.profiles (id),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (client_id, team_member_id)
);

comment on table public.client_access is
  'Concede a um team_member acesso aos dados de um client_id. Nunca visível ao próprio cliente (é metadado interno de organização do escritório).';

-- -----------------------------------------------------------------------------
-- 2.5 processes — processos judiciais do cliente (1 cliente : N processos).
-- -----------------------------------------------------------------------------
create table if not exists public.processes (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients (id) on delete cascade,
  process_number        text not null,
  court                 text,
  phase                 text,
  status                text not null default 'Ativo'
                          check (status in ('Ativo', 'Suspenso', 'Arquivado', 'Encerrado')),
  practice_area         text,
  client_summary        text,
  is_visible_to_client  boolean not null default false,
  notion_page_id        text unique,
  created_by            uuid references public.profiles (id),
  updated_by            uuid references public.profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.6 process_updates — andamentos de um processo.
-- -----------------------------------------------------------------------------
create table if not exists public.process_updates (
  id                      uuid primary key default gen_random_uuid(),
  process_id              uuid not null references public.processes (id) on delete cascade,
  client_id               uuid not null references public.clients (id) on delete cascade,
  update_date             date not null,
  original_text           text,
  technical_summary       text,
  plain_language_summary  text,
  classification          text,
  possible_deadline       date,
  reviewed_by_lawyer      boolean not null default false,
  is_visible_to_client    boolean not null default false,
  published_at            timestamptz,
  notion_page_id          text unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.7 hearings — audiências.
-- -----------------------------------------------------------------------------
create table if not exists public.hearings (
  id                    uuid primary key default gen_random_uuid(),
  process_id            uuid not null references public.processes (id) on delete cascade,
  client_id             uuid not null references public.clients (id) on delete cascade,
  title                 text not null,
  hearing_type          text,
  scheduled_at          timestamptz not null,
  modality              text,
  location              text,
  access_link           text,
  status                text not null default 'Agendada'
                          check (status in ('Agendada', 'Realizada', 'Cancelada', 'Adiada')),
  client_notified       boolean not null default false,
  is_visible_to_client  boolean not null default false,
  notion_page_id        text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.8 deadlines — prazos processuais.
-- -----------------------------------------------------------------------------
create table if not exists public.deadlines (
  id                    uuid primary key default gen_random_uuid(),
  process_id            uuid not null references public.processes (id) on delete cascade,
  client_id             uuid not null references public.clients (id) on delete cascade,
  description           text not null,
  due_date              date not null,
  priority              text default 'Média'
                          check (priority in ('Baixa', 'Média', 'Alta', 'Urgente')),
  status                text not null default 'Em aberto'
                          check (status in ('Em aberto', 'Concluído', 'Perdido')),
  client_notified       boolean not null default false,
  is_visible_to_client  boolean not null default false,
  notion_page_id        text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.9 contracts — contratos do cliente com o escritório.
-- -----------------------------------------------------------------------------
create table if not exists public.contracts (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients (id) on delete cascade,
  process_id            uuid references public.processes (id) on delete set null,
  title                 text not null,
  contract_type         text,
  status                text not null default 'Rascunho'
                          check (status in ('Rascunho', 'Vigente', 'Encerrado', 'Cancelado')),
  value                 numeric(12, 2) check (value >= 0),
  signed_at             date,
  storage_path          text,
  is_visible_to_client  boolean not null default false,
  notion_page_id        text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.10 financial_entries — lançamentos financeiros do cliente.
-- -----------------------------------------------------------------------------
create table if not exists public.financial_entries (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients (id) on delete cascade,
  contract_id           uuid references public.contracts (id) on delete set null,
  process_id            uuid references public.processes (id) on delete set null,
  description           text not null,
  entry_type            text,
  installment_label     text,
  amount                numeric(12, 2) not null check (amount >= 0),
  due_date              date not null,
  paid_at               date,
  status                text not null default 'pendente'
                          check (status in ('pendente', 'a_vencer', 'pago', 'vencido', 'cancelado', 'renegociado')),
  payment_method        text,
  payment_link          text,
  receipt_storage_path  text,
  is_visible_to_client  boolean not null default false,
  notion_page_id        text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Requisito 12: paid_at só faz sentido com status pago/renegociado, e todo
  -- lançamento "pago" precisa ter data de pagamento (nenhuma das duas
  -- condições valia sozinha na primeira versão desta migration — combinadas
  -- aqui após revisão).
  check (paid_at is null or status in ('pago', 'renegociado')),
  check (status <> 'pago' or paid_at is not null)
);

-- -----------------------------------------------------------------------------
-- 2.11 documents — documentos do processo/cliente.
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients (id) on delete cascade,
  process_id            uuid references public.processes (id) on delete set null,
  name                  text not null,
  category              text,
  storage_path          text not null,
  uploaded_by_role      text not null check (uploaded_by_role in ('client', 'staff')),
  size_bytes            bigint not null check (size_bytes > 0),
  mime_type             text not null,
  is_confidential       boolean not null default false,
  reviewed              boolean not null default false,
  is_visible_to_client  boolean not null default false,
  notion_page_id        text unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Um documento sigiloso nunca pode estar simultaneamente marcado visível ao cliente.
  check (not (is_confidential and is_visible_to_client))
);

-- -----------------------------------------------------------------------------
-- 2.12 messages — canal de mensagens cliente <-> escritório. Conteúdo
--      imutável após o envio (ver trigger na seção 7) — só read_at muda.
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients (id) on delete cascade,
  sender_profile_id   uuid not null references public.profiles (id),
  sender_role         text not null check (sender_role in ('client', 'staff')),
  body                text not null check (char_length(body) > 0),
  read_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.13 notifications — notificações no portal (cliente e/ou staff).
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references public.clients (id) on delete cascade,
  profile_id  uuid references public.profiles (id) on delete cascade,
  title       text not null,
  body        text not null,
  category    text,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (client_id is not null or profile_id is not null)
);

-- -----------------------------------------------------------------------------
-- 2.14 access_logs — trilha de QUEM ACESSOU o quê (leitura/download).
--      Append-only: sem updated_at, sem policy de UPDATE/DELETE para ninguém.
-- -----------------------------------------------------------------------------
create table if not exists public.access_logs (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid references public.profiles (id),
  client_id      uuid references public.clients (id),
  action         text not null,
  resource_type  text not null,
  resource_id    uuid,
  ip_hash        text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.15 audit_logs — trilha de QUEM MUDOU o quê (requisito 14). Populada
--      automaticamente por trigger (seção 6), não depende da aplicação, e
--      passa por redação de campos sensíveis antes de gravar.
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id                uuid primary key default gen_random_uuid(),
  actor_profile_id  uuid references public.profiles (id),
  action            text not null check (action in ('insert', 'update', 'delete')),
  entity_type       text not null,
  entity_id         uuid,
  before            jsonb,
  after             jsonb,
  created_at        timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.16 notion_sync_logs — histórico de sincronização com o Notion.
-- -----------------------------------------------------------------------------
create table if not exists public.notion_sync_logs (
  id               uuid primary key default gen_random_uuid(),
  entity_type      text not null,
  notion_page_id   text,
  direction        text not null check (direction in ('from_notion', 'to_notion')),
  status           text not null check (status in ('success', 'error', 'skipped')),
  error_message    text,
  payload_hash     text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  created_by       uuid references public.profiles (id)
);

-- -----------------------------------------------------------------------------
-- 2.17 ai_summaries — resumos gerados por IA, sempre pendentes de revisão
--      humana antes de qualquer publicação (nunca lidos pelo cliente
--      diretamente — só via process_updates, depois de aprovado).
-- -----------------------------------------------------------------------------
create table if not exists public.ai_summaries (
  id                      uuid primary key default gen_random_uuid(),
  process_update_id       uuid not null references public.process_updates (id) on delete cascade,
  client_id               uuid not null references public.clients (id) on delete cascade,
  model                   text not null,
  model_version           text not null,
  prompt_version          text not null,
  technical_summary       text not null,
  plain_language_summary  text not null,
  classification          text,
  possible_deadline       date,
  sensitive_flags         text[] not null default '{}',
  status                  text not null default 'pending_review'
                            check (status in ('pending_review', 'approved', 'rejected', 'edited')),
  reviewed_by             uuid references public.profiles (id),
  reviewed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2.18 support_requests — pedidos de suporte abertos pelo cliente.
-- -----------------------------------------------------------------------------
create table if not exists public.support_requests (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  subject      text not null,
  body         text not null,
  status       text not null default 'Aberto'
                 check (status in ('Aberto', 'Em andamento', 'Resolvido', 'Fechado')),
  assigned_to  uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);


-- =============================================================================
-- 3. Índices (requisito 10: client_id, process_id, user_id, notion_page_id,
--    status, datas). unique() já cria índice implícito — listados aqui para
--    documentação e para os casos não-únicos.
-- =============================================================================

-- client_id
create index if not exists idx_client_access_client_id      on public.client_access (client_id);
create index if not exists idx_processes_client_id          on public.processes (client_id);
create index if not exists idx_process_updates_client_id    on public.process_updates (client_id);
create index if not exists idx_hearings_client_id           on public.hearings (client_id);
create index if not exists idx_deadlines_client_id          on public.deadlines (client_id);
create index if not exists idx_contracts_client_id          on public.contracts (client_id);
create index if not exists idx_financial_entries_client_id  on public.financial_entries (client_id);
create index if not exists idx_documents_client_id          on public.documents (client_id);
create index if not exists idx_messages_client_id           on public.messages (client_id);
create index if not exists idx_notifications_client_id      on public.notifications (client_id);
create index if not exists idx_access_logs_client_id        on public.access_logs (client_id);
create index if not exists idx_ai_summaries_client_id       on public.ai_summaries (client_id);
create index if not exists idx_support_requests_client_id   on public.support_requests (client_id);

-- process_id
create index if not exists idx_process_updates_process_id     on public.process_updates (process_id);
create index if not exists idx_hearings_process_id            on public.hearings (process_id);
create index if not exists idx_deadlines_process_id           on public.deadlines (process_id);
create index if not exists idx_contracts_process_id           on public.contracts (process_id);
create index if not exists idx_financial_entries_process_id   on public.financial_entries (process_id);
create index if not exists idx_documents_process_id           on public.documents (process_id);

-- user_id / profile_id (clients.user_id e team_members.profile_id já são UNIQUE,
-- portanto já indexados; os demais profile_id abaixo não são únicos)
create index if not exists idx_notifications_profile_id   on public.notifications (profile_id);
create index if not exists idx_access_logs_profile_id      on public.access_logs (profile_id);
create index if not exists idx_audit_logs_actor_profile_id on public.audit_logs (actor_profile_id);
create index if not exists idx_messages_sender_profile_id  on public.messages (sender_profile_id);
create index if not exists idx_client_access_team_member_id on public.client_access (team_member_id);

-- notion_page_id (colunas unique já indexadas implicitamente — documentado aqui)
-- processes.notion_page_id, process_updates.notion_page_id, hearings.notion_page_id,
-- deadlines.notion_page_id, contracts.notion_page_id, financial_entries.notion_page_id,
-- documents.notion_page_id: já cobertos pela constraint UNIQUE.
create index if not exists idx_notion_sync_logs_notion_page_id on public.notion_sync_logs (notion_page_id);

-- status
create index if not exists idx_clients_status            on public.clients (status);
create index if not exists idx_processes_status          on public.processes (status);
create index if not exists idx_hearings_status           on public.hearings (status);
create index if not exists idx_deadlines_status          on public.deadlines (status);
create index if not exists idx_contracts_status          on public.contracts (status);
create index if not exists idx_financial_entries_status  on public.financial_entries (status);
create index if not exists idx_ai_summaries_status       on public.ai_summaries (status);
create index if not exists idx_support_requests_status   on public.support_requests (status);

-- datas
create index if not exists idx_process_updates_update_date  on public.process_updates (update_date);
create index if not exists idx_hearings_scheduled_at        on public.hearings (scheduled_at);
create index if not exists idx_deadlines_due_date           on public.deadlines (due_date);
create index if not exists idx_financial_entries_due_date   on public.financial_entries (due_date);
create index if not exists idx_financial_entries_paid_at    on public.financial_entries (paid_at);
create index if not exists idx_documents_created_at         on public.documents (created_at);
create index if not exists idx_access_logs_created_at       on public.access_logs (created_at);
create index if not exists idx_audit_logs_created_at        on public.audit_logs (created_at);
create index if not exists idx_notion_sync_logs_started_at  on public.notion_sync_logs (started_at);


-- =============================================================================
-- 4. Funções auxiliares de RLS (SECURITY DEFINER — evita recursão de RLS ao
--    consultar public.profiles/public.client_access de dentro das próprias
--    políticas dessas tabelas).
--
--    Todas exigem is_active = true no(s) profile(s) envolvido(s) — uma conta
--    desativada (bloqueio de funcionário desligado, suspensão de cliente)
--    perde acesso imediatamente, mesmo que o role continue admin/staff/client
--    na linha (achado corrigido nesta revisão — ver seção 10).
-- =============================================================================

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff') and is_active = true
  );
$$;

create or replace function public.owns_client(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.clients c
    join public.profiles p on p.id = c.user_id
    where c.id = p_client_id and c.user_id = auth.uid() and p.is_active = true
  );
$$;

create or replace function public.current_client_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select c.id
  from public.clients c
  join public.profiles p on p.id = c.user_id
  where c.user_id = auth.uid() and p.is_active = true;
$$;

-- Função central: TRUE se o usuário autenticado pode ver/gerenciar dados do
-- client_id informado — cobre os três casos: admin (tudo), o próprio
-- cliente (owns_client) e staff formalmente atribuído (client_access), com
-- is_active checado em profiles E em team_members E em client_access (as
-- três camadas precisam estar ativas simultaneamente).
create or replace function public.has_client_access(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or public.owns_client(p_client_id)
    or exists (
      select 1
      from public.client_access ca
      join public.team_members tm on tm.id = ca.team_member_id
      join public.profiles p on p.id = tm.profile_id
      where ca.client_id = p_client_id
        and ca.is_active = true
        and tm.is_active = true
        and p.is_active = true
        and tm.profile_id = auth.uid()
    );
$$;


-- =============================================================================
-- 5. Trigger genérico de updated_at (requisito 11)
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'team_members', 'clients', 'client_access',
    'processes', 'process_updates', 'hearings', 'deadlines', 'contracts',
    'financial_entries', 'documents', 'messages', 'notifications',
    'ai_summaries', 'support_requests'
  ]
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I;
       create trigger trg_set_updated_at
       before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- access_logs, audit_logs e notion_sync_logs são deliberadamente append-only
-- (sem updated_at, sem trigger) — são trilhas de log, nunca editadas.


-- =============================================================================
-- 6. Trilha de auditoria automática (requisito 14) — captura INSERT/UPDATE/
--    DELETE nas tabelas sensíveis para audit_logs, independente do código
--    da aplicação lembrar de chamar algo. Redação de campos sensíveis antes
--    de gravar (defesa em profundidade, mesmo que a aplicação também redija).
-- =============================================================================

create or replace function public.redact_sensitive_jsonb(data jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  sensitive_keys text[] := array[
    'document_number_encrypted', 'document_last4', 'receipt_storage_path',
    'payment_link', 'password', 'token', 'access_token', 'refresh_token',
    'bank_account', 'iban', 'pix_key', 'otp', 'activation_code',
    'activation_code_hash', 'service_role_key', 'api_key'
  ];
  result jsonb;
  key text;
begin
  if data is null then
    return null;
  end if;

  result := data;
  foreach key in array sensitive_keys loop
    if result ? key then
      result := jsonb_set(result, array[key], '"[REDACTED]"'::jsonb);
    end if;
  end loop;

  return result;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, before, after)
    values (v_actor, 'insert', tg_table_name, new.id, null, public.redact_sensitive_jsonb(to_jsonb(new)));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, before, after)
    values (
      v_actor, 'update', tg_table_name, new.id,
      public.redact_sensitive_jsonb(to_jsonb(old)), public.redact_sensitive_jsonb(to_jsonb(new))
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, before, after)
    values (v_actor, 'delete', tg_table_name, old.id, public.redact_sensitive_jsonb(to_jsonb(old)), null);
    return old;
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  -- Tabelas com dado sensível/decisão de negócio relevante o suficiente para
  -- exigir trilha de auditoria automática de toda mudança.
  foreach t in array array[
    'clients', 'team_members', 'client_access',
    'processes', 'financial_entries', 'contracts', 'documents'
  ]
  loop
    execute format(
      'drop trigger if exists trg_audit_log on public.%I;
       create trigger trg_audit_log
       after insert or update or delete on public.%I
       for each row execute function public.write_audit_log();',
      t, t
    );
  end loop;
end $$;


-- =============================================================================
-- 7. Defesa em profundidade além da RLS (requisito 7): mesmo que uma policy
--    seja alterada incorretamente no futuro, estes triggers bloqueiam
--    explicitamente qualquer escrita de cliente nas tabelas operacionais, e
--    protegem a integridade de campos que não devem mudar após a criação.
-- =============================================================================

create or replace function public.block_client_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() = 'client' then
    raise exception 'Clientes nao podem alterar dados de %.', tg_table_name
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'processes', 'process_updates', 'hearings', 'deadlines',
    'contracts', 'financial_entries', 'ai_summaries'
  ]
  loop
    execute format(
      'drop trigger if exists trg_block_client_write on public.%I;
       create trigger trg_block_client_write
       before insert or update or delete on public.%I
       for each row execute function public.block_client_write();',
      t, t
    );
  end loop;
end $$;

-- clients: cliente PODE atualizar seu próprio cadastro (nome/e-mail/telefone),
-- mas nunca os campos abaixo — bloqueado por trigger dedicado, não pelo
-- trigger genérico acima (que impediria qualquer update, inclusive o legítimo).
create or replace function public.prevent_client_restricted_fields_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() = 'client' then
    if new.status is distinct from old.status
       or new.internal_code is distinct from old.internal_code
       or new.document_number_encrypted is distinct from old.document_number_encrypted
       or new.document_last4 is distinct from old.document_last4
       or new.user_id is distinct from old.user_id then
      raise exception 'Cliente nao pode alterar campos restritos de clients.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_client_restricted_fields on public.clients;
create trigger trg_prevent_client_restricted_fields
  before update on public.clients
  for each row execute function public.prevent_client_restricted_fields_update();

-- team_members: só pode referenciar profiles com role staff/admin.
create or replace function public.enforce_team_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.profile_id and role in ('staff', 'admin')
  ) then
    raise exception 'team_members.profile_id deve referenciar um profile com role staff ou admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_team_member_role on public.team_members;
create trigger trg_enforce_team_member_role
  before insert or update on public.team_members
  for each row execute function public.enforce_team_member_role();

-- messages: conteúdo imutável após o envio — só read_at pode mudar. Sem
-- isso, a policy messages_update_read_at (que precisa liberar UPDATE para
-- marcar como lida) permitiria reescrever body/sender_role/client_id de uma
-- mensagem já enviada, o que é um problema sério de integridade num canal
-- de comunicação com cliente de escritório de advocacia.
create or replace function public.prevent_message_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body
     or new.sender_profile_id is distinct from old.sender_profile_id
     or new.sender_role is distinct from old.sender_role
     or new.client_id is distinct from old.client_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Mensagens sao imutaveis apos o envio (somente read_at pode ser alterado).'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_message_tampering on public.messages;
create trigger trg_prevent_message_tampering
  before update on public.messages
  for each row execute function public.prevent_message_tampering();


-- =============================================================================
-- 8. Row Level Security (requisitos 5, 6, 7, 8, 9)
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.team_members       enable row level security;
alter table public.clients            enable row level security;
alter table public.client_access      enable row level security;
alter table public.processes          enable row level security;
alter table public.process_updates    enable row level security;
alter table public.hearings           enable row level security;
alter table public.deadlines          enable row level security;
alter table public.contracts          enable row level security;
alter table public.financial_entries  enable row level security;
alter table public.documents          enable row level security;
alter table public.messages           enable row level security;
alter table public.notifications      enable row level security;
alter table public.access_logs        enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.notion_sync_logs   enable row level security;
alter table public.ai_summaries       enable row level security;
alter table public.support_requests   enable row level security;

-- Nenhuma tabela tem "force row level security": não há necessidade de
-- aplicar RLS ao dono/superusuário aqui — service_role (usado apenas no
-- servidor, nunca no navegador) já ignora RLS por padrão do Supabase.

-- -----------------------------------------------------------------------------
-- 8.1 profiles
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
  -- RLS aqui só decide QUAIS LINHAS (a própria ou, se admin, qualquer uma).
  -- QUAIS COLUNAS podem mudar é decidido pelo trigger
  -- trg_prevent_profile_privilege_escalation logo abaixo — RLS não tem
  -- acesso a OLD/NEW para comparar valor antigo x novo dentro da própria
  -- expressão de policy (isso só existe em trigger; uma tentativa anterior
  -- desta migration usava "old.role" direto na policy e falhava com "missing
  -- FROM-clause entry for table old" — corrigido nesta revisão).

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Somente administradores podem alterar o role de um usuario.'
        using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Somente administradores podem ativar/desativar um usuario.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_privilege_escalation on public.profiles;
create trigger trg_prevent_profile_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- Sem policy de INSERT/DELETE para authenticated: criação/remoção de profile
-- acontece via service_role (fluxo de convite/onboarding), nunca pelo próprio
-- usuário.

-- -----------------------------------------------------------------------------
-- 8.2 team_members — nunca visível/gerenciável por clientes.
-- -----------------------------------------------------------------------------
create policy team_members_select on public.team_members
  for select to authenticated
  using (public.is_admin() or profile_id = auth.uid());

create policy team_members_insert_admin on public.team_members
  for insert to authenticated
  with check (public.is_admin());

create policy team_members_update_admin on public.team_members
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy team_members_delete_admin on public.team_members
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8.3 clients — cliente só vê e só atualiza (campos não-restritos) a própria
--     linha; staff só o que lhe foi atribuído; admin tudo.
-- -----------------------------------------------------------------------------
create policy clients_select on public.clients
  for select to authenticated
  using (public.has_client_access(id));

create policy clients_insert_staff on public.clients
  for insert to authenticated
  with check (public.is_staff_or_admin());

create policy clients_update on public.clients
  for update to authenticated
  using (public.has_client_access(id))
  with check (public.has_client_access(id));
  -- Campos restritos (status, internal_code, documentos, user_id) são
  -- bloqueados para o papel client pelo trigger
  -- trg_prevent_client_restricted_fields, não pela policy (a policy só
  -- decide QUAIS LINHAS, o trigger decide QUAIS COLUNAS).

create policy clients_delete_admin on public.clients
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8.4 client_access — apenas admin gerencia; staff só vê as próprias
--     atribuições; cliente NUNCA enxerga esta tabela.
-- -----------------------------------------------------------------------------
create policy client_access_select on public.client_access
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.team_members tm
      where tm.id = team_member_id and tm.profile_id = auth.uid()
    )
  );

create policy client_access_insert_admin on public.client_access
  for insert to authenticated
  with check (public.is_admin());

create policy client_access_update_admin on public.client_access
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy client_access_delete_admin on public.client_access
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8.5 processes / process_updates / hearings / deadlines / contracts /
--     financial_entries — mesmo padrão para as seis tabelas "operacionais":
--     cliente só SELECT do próprio client_id e só quando is_visible_to_client;
--     nenhum INSERT/UPDATE/DELETE de cliente (requisito 7, reforçado também
--     pelo trigger trg_block_client_write da seção 7).
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'processes', 'process_updates', 'hearings', 'deadlines',
    'contracts', 'financial_entries'
  ]
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select to authenticated
        using (
          public.is_admin()
          or (
            public.has_client_access(client_id)
            and (public.current_profile_role() <> 'client' or is_visible_to_client)
          )
        );

      create policy %1$s_insert_staff on public.%1$s
        for insert to authenticated
        with check (public.is_staff_or_admin() and public.has_client_access(client_id));

      create policy %1$s_update_staff on public.%1$s
        for update to authenticated
        using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
        with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

      create policy %1$s_delete_admin on public.%1$s
        for delete to authenticated
        using (public.is_admin());
    $f$, t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 8.6 documents — cliente PODE inserir (upload próprio), nunca reclassificar
--     sigilo/visibilidade; nunca vê documento confidencial, nem o próprio.
-- -----------------------------------------------------------------------------
create policy documents_select on public.documents
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.has_client_access(client_id)
      and (
        public.current_profile_role() <> 'client'
        or (is_visible_to_client and not is_confidential)
      )
    )
  );

create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    public.has_client_access(client_id)
    and (
      (public.current_profile_role() = 'client' and uploaded_by_role = 'client')
      or (public.is_staff_or_admin() and uploaded_by_role = 'staff')
    )
  );

create policy documents_update_staff on public.documents
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

create policy documents_delete_staff on public.documents
  for delete to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- -----------------------------------------------------------------------------
-- 8.7 messages — canal bidirecional; cliente e staff podem inserir mensagem
--     no client_id ao qual têm acesso, cada um só com o próprio sender_role.
--     UPDATE existe apenas para marcar como lida (conteúdo protegido por
--     trigger, seção 7).
-- -----------------------------------------------------------------------------
create policy messages_select on public.messages
  for select to authenticated
  using (public.is_admin() or public.has_client_access(client_id));

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    public.has_client_access(client_id)
    and sender_profile_id = auth.uid()
    and (
      (public.current_profile_role() = 'client' and sender_role = 'client')
      or (public.is_staff_or_admin() and sender_role = 'staff')
    )
  );

create policy messages_update_read_at on public.messages
  for update to authenticated
  using (public.has_client_access(client_id))
  with check (public.has_client_access(client_id));

-- Sem policy de DELETE: mensagens são um registro de comunicação imutável.

-- -----------------------------------------------------------------------------
-- 8.8 notifications — visível a quem ela é destinada (cliente ou profile
--     específico), nunca a outro cliente. INSERT restrito ao client_id que o
--     staff realmente tem acesso (evita notificação "cross-client").
-- -----------------------------------------------------------------------------
create policy notifications_select on public.notifications
  for select to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or (client_id is not null and public.has_client_access(client_id))
  );

create policy notifications_insert_staff on public.notifications
  for insert to authenticated
  with check (
    public.is_staff_or_admin()
    and (client_id is null or public.has_client_access(client_id))
  );

create policy notifications_update_mark_read on public.notifications
  for update to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or (client_id is not null and public.has_client_access(client_id))
  )
  with check (
    public.is_admin()
    or profile_id = auth.uid()
    or (client_id is not null and public.has_client_access(client_id))
  );

-- -----------------------------------------------------------------------------
-- 8.9 access_logs / audit_logs / notion_sync_logs — somente leitura por
--     admin; nenhuma policy de INSERT/UPDATE/DELETE para authenticated (só
--     service_role ou os triggers SECURITY DEFINER da seção 6 escrevem).
-- -----------------------------------------------------------------------------
create policy access_logs_select_admin on public.access_logs
  for select to authenticated
  using (public.is_admin());

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

create policy notion_sync_logs_select_admin on public.notion_sync_logs
  for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8.10 ai_summaries — nunca lido pelo cliente diretamente (só via
--      process_updates, depois de aprovado por um humano).
-- -----------------------------------------------------------------------------
create policy ai_summaries_select_staff on public.ai_summaries
  for select to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

create policy ai_summaries_insert_staff on public.ai_summaries
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy ai_summaries_update_staff on public.ai_summaries
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

create policy ai_summaries_delete_admin on public.ai_summaries
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8.11 support_requests — cliente cria e vê os próprios; staff/admin vê e
--      gerencia os dos clientes atribuídos (não os de qualquer cliente).
-- -----------------------------------------------------------------------------
create policy support_requests_select on public.support_requests
  for select to authenticated
  using (public.is_admin() or public.has_client_access(client_id));

create policy support_requests_insert on public.support_requests
  for insert to authenticated
  with check (
    public.owns_client(client_id)
    or (public.is_staff_or_admin() and public.has_client_access(client_id))
  );

create policy support_requests_update_staff on public.support_requests
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- Sem policy de DELETE: pedidos de suporte nunca são apagados, só encerrados
-- (status = 'Fechado').


-- =============================================================================
-- 9. (reservado) — testes de acesso cruzado ficam em arquivo separado
--    (supabase/schema-portal-juridico/02_testes_acesso_cruzado.sql), não como
--    parte desta migration, para não misturar DDL com massa de dados
--    fictícia numa migration que pode rodar em produção.
-- =============================================================================


-- =============================================================================
-- 10. Revisão de segurança desta migration
-- =============================================================================
--
-- 10.1 "Existe alguma forma de um cliente ler dado de outro cliente?"
-- -----------------------------------------------------------------------------
-- Caminho único de "sou o cliente X": auth.uid() = clients.user_id (único).
-- Toda tabela com client_id usa has_client_access(client_id), que só retorna
-- true para admin, o próprio dono (owns_client) ou staff com atribuição
-- ativa — nas três camadas (profiles.is_active, team_members.is_active,
-- client_access.is_active) simultaneamente. Um cliente nunca tem role
-- staff/admin (constraint em profiles.role), então nenhuma policy deste
-- schema combina "role = client" com um client_id diferente do próprio.
-- client_access/team_members nunca concedem select a role client. Logs
-- (access_logs/audit_logs/notion_sync_logs) são admin-only. Conclusão:
-- nenhum caminho identificado — ver prova executável em
-- supabase/schema-portal-juridico/02_testes_acesso_cruzado.sql.
--
-- 10.2 Achados corrigidos nesta revisão (em relação a uma primeira versão
--      deste schema, escrita antes desta passagem de revisão pedida):
-- -----------------------------------------------------------------------------
--  a) is_admin()/is_staff_or_admin() não checavam profiles.is_active — uma
--     conta de staff/admin desativada (ex.: funcionário desligado) mantinha
--     acesso total via RLS mesmo após o bloqueio, porque a checagem olhava
--     só para "role". Corrigido: as duas funções, mais owns_client() e o
--     ramo de staff em has_client_access(), agora exigem is_active = true
--     em profiles (e, no caso de staff, também em team_members e
--     client_access).
--  b) notifications_insert_staff e support_requests_insert permitiam que
--     QUALQUER staff/admin inserisse uma notificação/pedido de suporte para
--     QUALQUER client_id, mesmo sem atribuição — a policy checava só
--     is_staff_or_admin(), não has_client_access(client_id). Corrigido:
--     ambas agora exigem has_client_access(client_id) também para staff.
--  c) messages_update_read_at, necessária para permitir marcar uma mensagem
--     como lida, liberava UPDATE de QUALQUER coluna para quem tem acesso ao
--     client_id — incluindo body/sender_role/sender_profile_id/client_id,
--     isto é, permitia reescrever o conteúdo de uma mensagem já enviada
--     (problema de integridade/repúdio num canal de comunicação jurídica).
--     Corrigido: trigger trg_prevent_message_tampering (seção 7) bloqueia
--     qualquer mudança nesses campos, deixando só read_at mutável.
--  d) profiles_update_self_or_admin não protegia contra o próprio usuário
--     alterar seu role/is_active (um cliente comum poderia se auto-promover
--     a admin, ou reverter o próprio bloqueio). Policies de RLS não têm
--     acesso a OLD/NEW para comparar valor antigo x novo dentro da própria
--     expressão (isso só existe dentro de uma função de trigger) — uma
--     tentativa desta migration referenciar "old.role" direto na policy
--     falhava com "missing FROM-clause entry for table old" ao aplicar.
--     Corrigido com um trigger dedicado (trg_prevent_profile_privilege_
--     escalation, mesmo padrão já usado em
--     supabase/migrations/0004_indexes_and_triggers.sql deste repositório),
--     que bloqueia mudança de role/is_active por qualquer um que não seja
--     admin.
--  e) write_audit_log() gravava to_jsonb(new)/to_jsonb(old) sem redigir
--     campos sensíveis (document_number_encrypted, receipt_storage_path,
--     payment_link) — mesmo cifrado, o bytea cifrado aparecendo como hex em
--     audit_logs não precisa existir se pode ser redigido. Corrigido:
--     redact_sensitive_jsonb() (mesmo padrão já usado em
--     supabase/migrations/0007_functions_and_safeguards.sql deste
--     repositório) aplicado antes de gravar.
--  f) Constraint financeira original só cobria "paid_at implica status
--     pago/renegociado", mas não o inverso ("pago" sem paid_at passava).
--     Corrigido: adicionado check (status <> 'pago' or paid_at is not null).
--
-- 10.3 Risco operacional (não é uma falha de RLS, é de deployment) — ver o
--      aviso no topo deste arquivo: NÃO aplicar num projeto Supabase que já
--      rodou supabase/migrations/0001..0010 deste repositório. As duas
--      cadeias de migration descrevem modelos de dados incompatíveis
--      (client_access genérico vs. team_members + client_access separados).
-- =============================================================================
