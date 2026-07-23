-- 0003_domain_tables.sql
-- Tabelas de dominio juridico/operacional. Todas incluem, quando aplicavel,
-- as colunas padrao: id, client_id, created_at, updated_at, created_by,
-- updated_by, notion_page_id, is_visible_to_client, archived_at.

create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  process_number text not null,
  court text,
  jurisdiction text,
  case_class text,
  subject text,
  practice_area text,
  phase text,
  status text not null default 'Ativo',
  responsible_team_member_id uuid references public.team_members (id),
  client_summary text,
  internal_summary text,
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.processes.internal_summary is
  'Uso exclusivo da equipe. Nunca exposto ao cliente por nenhuma query/view/API.';

create table if not exists public.process_updates (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  update_date date not null,
  original_text text,
  technical_summary text,
  plain_language_summary text,
  classification text,
  possible_deadline date,
  reviewed_by_lawyer boolean not null default false,
  published_at timestamptz,
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hearings (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  hearing_type text,
  scheduled_at timestamptz not null,
  modality text,
  location text,
  access_link text,
  status text not null default 'Agendada',
  client_notified boolean not null default false,
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  description text not null,
  due_date date not null,
  priority text,
  status text not null default 'Em aberto',
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.deadlines is
  'Prazos informativos ao cliente (somente leitura). O controle operacional do prazo continua na ferramenta interna/Notion.';

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  process_id uuid references public.processes (id) on delete set null,
  contract_number text not null,
  service_type text,
  total_value numeric(12, 2),
  down_payment numeric(12, 2),
  installments_count integer,
  success_fee_description text,
  contract_storage_path text,
  signed_at timestamptz,
  status text not null default 'Em elaboração',
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  contract_id uuid references public.contracts (id) on delete set null,
  process_id uuid references public.processes (id) on delete set null,
  description text not null,
  entry_type text,
  installment_label text,
  amount numeric(12, 2) not null,
  due_date date not null,
  paid_at timestamptz,
  status public.financial_status not null default 'pendente',
  payment_method text,
  payment_link text,
  receipt_storage_path text,
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.financial_entries is
  'Cliente possui apenas SELECT (RLS). Nenhuma policy de INSERT/UPDATE/DELETE e concedida ao papel client; reforcado tambem por trigger prevent_client_financial_write.';

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  process_id uuid references public.processes (id) on delete set null,
  name text not null,
  category text,
  storage_path text not null,
  uploaded_by_role public.document_uploader_role not null,
  size_bytes bigint not null,
  mime_type text not null,
  is_confidential boolean not null default false,
  reviewed boolean not null default false,
  notion_page_id text unique,
  is_visible_to_client boolean not null default false,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  sender_profile_id uuid not null references public.profiles (id),
  sender_role public.message_sender_role not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  category text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'Aberto',
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  process_update_id uuid not null references public.process_updates (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  model text not null,
  model_version text not null,
  prompt_version text not null,
  technical_summary text not null,
  plain_language_summary text not null,
  classification text,
  possible_deadline date,
  sensitive_flags text[] not null default '{}',
  status public.ai_summary_status not null default 'pending_review',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_summaries is
  'Saida da IA sempre comeca como pending_review. So e copiada para process_updates (visivel ao cliente) apos aprovacao humana explicita — ver approveAiSummary em src/modules/ai-summaries.';

-- Tabelas de auditoria/log: somente INSERT via service_role (RLS na migration
-- 0005 nao concede INSERT/UPDATE/DELETE a authenticated). SELECT restrito a
-- admin (e, no caso de ai_summaries, staff atribuido ao cliente).

create table if not exists public.notion_sync_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  notion_page_id text,
  direction text not null default 'from_notion',
  status public.notion_sync_status not null,
  error_message text,
  payload_hash text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by uuid references public.profiles (id)
);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  client_id uuid references public.clients (id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
