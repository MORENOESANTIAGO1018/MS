-- 0002_core_tables.sql
-- Tabelas nucleo: profiles, team_members, clients, client_access.
-- Ver MODELO-DE-DADOS.md para o desenho completo.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null,
  email text not null unique,
  phone text,
  is_active boolean not null default true,
  blocked_at timestamptz,
  blocked_reason text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Espelha auth.users. Nunca criado por cadastro publico — sempre via convite (client_access) ou provisionamento administrativo (staff/admin).';

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  oab text,
  "position" text,
  practice_areas text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  -- CPF/CNPJ completo, criptografado em repouso com pgcrypto (pgp_sym_encrypt).
  -- A chave de criptografia vive fora do banco (variavel de ambiente/Vault),
  -- nunca em uma coluna desta tabela. Ver SEGURANCA-E-LGPD.md secao 2.
  document_number_encrypted bytea,
  document_last4 text,
  email text,
  phone text,
  whatsapp text,
  status text not null default 'Lead',
  internal_code text unique,
  notion_page_id text unique,
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.clients.document_number_encrypted is
  'CPF/CNPJ criptografado (pgp_sym_encrypt). Nunca selecionar em texto claro fora de uma funcao server-only especifica de descriptografia auditada.';

create table if not exists public.client_access (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  access_level public.client_access_level not null default 'viewer',
  is_active boolean not null default true,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id),
  invited_by uuid references public.profiles (id),
  activation_code_hash text,
  activation_code_expires_at timestamptz,
  activation_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, client_id)
);

comment on table public.client_access is
  'Controla quem pode acessar os dados de um cliente. access_level=owner/viewer para contatos do proprio cliente (pessoa juridica pode ter varios); access_level=staff para membros da equipe atribuidos a este cliente. activation_code_hash e de uso unico (Fase 4).';
