-- 0005_auth_helper_functions.sql
-- Funcoes auxiliares usadas pelas politicas de RLS (migration seguinte).
-- SECURITY DEFINER com search_path fixo: evitam recursao de RLS ao consultar
-- public.profiles/public.client_access e evitam sequestro de search_path.

create or replace function public.current_profile_role()
returns public.user_role
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
    where id = auth.uid() and role in ('staff', 'admin') and is_active = true
  );
$$;

-- Verdadeiro se o usuario autenticado tem uma linha ativa em client_access
-- para o cliente informado — cobre tanto o proprio cliente (access_level
-- owner/viewer) quanto um membro da equipe formalmente atribuido
-- (access_level staff). E a base de "cliente ve so o proprio" e "funcionario
-- ve conforme atribuicao".
create or replace function public.has_client_access(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.client_access
    where client_id = p_client_id
      and profile_id = auth.uid()
      and is_active = true
  );
$$;

comment on function public.has_client_access(uuid) is
  'True se o usuario autenticado (cliente ou staff atribuido) tem acesso ativo ao client_id informado. Usada em praticamente todas as policies de SELECT das tabelas de dominio.';
