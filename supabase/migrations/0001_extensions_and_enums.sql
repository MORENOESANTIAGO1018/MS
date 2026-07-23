-- 0001_extensions_and_enums.sql
-- Extensoes e tipos enumerados usados em todo o schema.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('client', 'staff', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'client_access_level') then
    create type public.client_access_level as enum ('owner', 'viewer', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'financial_status') then
    create type public.financial_status as enum (
      'pago', 'pendente', 'a_vencer', 'vencido', 'renegociado', 'cancelado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'document_uploader_role') then
    create type public.document_uploader_role as enum ('staff', 'client');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_sender_role') then
    create type public.message_sender_role as enum ('staff', 'client');
  end if;

  if not exists (select 1 from pg_type where typname = 'notion_sync_status') then
    create type public.notion_sync_status as enum ('success', 'error', 'skipped');
  end if;

  if not exists (select 1 from pg_type where typname = 'ai_summary_status') then
    create type public.ai_summary_status as enum (
      'pending_review', 'approved', 'rejected', 'edited'
    );
  end if;
end $$;
