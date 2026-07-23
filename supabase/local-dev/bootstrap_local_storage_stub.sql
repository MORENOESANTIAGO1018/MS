-- bootstrap_local_storage_stub.sql
-- APENAS PARA TESTES LOCAIS NESTE AMBIENTE SANDBOX (sem Supabase CLI/Docker).
-- Recria o minimo do schema storage do Supabase (buckets, objects,
-- storage.foldername) para permitir validar
-- supabase/migrations/0009_storage.sql neste sandbox. NUNCA rodar contra um
-- projeto Supabase real — ver README.md deste diretorio.

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;

-- Implementacao equivalente a storage.foldername() do Supabase: retorna os
-- segmentos de pasta do caminho, excluindo o nome do arquivo.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  parts text[];
begin
  select string_to_array(name, '/') into parts;
  return parts[1 : array_length(parts, 1) - 1];
end;
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant all privileges on all tables in schema storage to authenticated, service_role, anon;
grant execute on all functions in schema storage to authenticated, service_role, anon;
