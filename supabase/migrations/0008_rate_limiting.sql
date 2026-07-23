-- 0008_rate_limiting.sql
-- Tabela de apoio para limitacao de tentativas (login, OTP, recuperacao de
-- senha, ativacao). Manipulada exclusivamente pelo servidor via service_role
-- (que ja ignora RLS por padrao no Supabase) — nenhuma policy e concedida a
-- authenticated/anon, entao o acesso direto pelo cliente e sempre negado.

create table if not exists public.auth_rate_limits (
  key text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;

comment on table public.auth_rate_limits is
  'Contadores de tentativas por chave (ex.: login:email@dominio.com). Somente service_role le/escreve. TTL logico controlado pela aplicacao via window_started_at + AUTH_RATE_LIMIT_WINDOW_MIN.';
