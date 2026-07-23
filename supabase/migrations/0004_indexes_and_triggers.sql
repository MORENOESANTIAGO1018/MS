-- 0004_indexes_and_triggers.sql
-- Indices de performance e triggers de integridade/seguranca (defesa em
-- profundidade alem do RLS, que e criado na migration seguinte).

-- Indices por client_id (leitura mais comum: "meus dados")
create index if not exists idx_processes_client_id on public.processes (client_id);
create index if not exists idx_process_updates_client_id on public.process_updates (client_id);
create index if not exists idx_process_updates_process_id on public.process_updates (process_id);
create index if not exists idx_hearings_client_id on public.hearings (client_id);
create index if not exists idx_deadlines_client_id on public.deadlines (client_id);
create index if not exists idx_contracts_client_id on public.contracts (client_id);
create index if not exists idx_financial_entries_client_id on public.financial_entries (client_id);
create index if not exists idx_documents_client_id on public.documents (client_id);
create index if not exists idx_messages_client_id on public.messages (client_id);
create index if not exists idx_notifications_client_id on public.notifications (client_id);
create index if not exists idx_support_requests_client_id on public.support_requests (client_id);
create index if not exists idx_ai_summaries_client_id on public.ai_summaries (client_id);
create index if not exists idx_client_access_profile_id on public.client_access (profile_id);
create index if not exists idx_client_access_client_id on public.client_access (client_id);

-- Indices compostos para listagens ordenadas / dashboards
create index if not exists idx_deadlines_client_due on public.deadlines (client_id, due_date);
create index if not exists idx_financial_entries_client_due on public.financial_entries (client_id, due_date);
create index if not exists idx_messages_client_created on public.messages (client_id, created_at desc);
create index if not exists idx_notifications_client_created on public.notifications (client_id, created_at desc);
create index if not exists idx_process_updates_client_created on public.process_updates (client_id, created_at desc);
create index if not exists idx_hearings_client_scheduled on public.hearings (client_id, scheduled_at);

-- Indices para logs/auditoria (consulta por ator e por periodo)
create index if not exists idx_access_logs_profile_id on public.access_logs (profile_id);
create index if not exists idx_access_logs_created_at on public.access_logs (created_at desc);
create index if not exists idx_audit_logs_actor on public.audit_logs (actor_profile_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_notion_sync_logs_entity on public.notion_sync_logs (entity_type, started_at desc);

-- ---------------------------------------------------------------------------
-- Trigger generico: mantem updated_at
-- ---------------------------------------------------------------------------
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
  tbl text;
begin
  foreach tbl in array array[
    'profiles', 'team_members', 'clients', 'client_access',
    'processes', 'process_updates', 'hearings', 'deadlines',
    'contracts', 'financial_entries', 'documents', 'messages',
    'notifications', 'support_requests', 'ai_summaries'
  ]
  loop
    execute format(
      'drop trigger if exists trg_set_updated_at on public.%I; ' ||
      'create trigger trg_set_updated_at before update on public.%I ' ||
      'for each row execute function public.set_updated_at();',
      tbl, tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Defesa em profundidade: bloqueia escrita de cliente em financial_entries
-- mesmo que uma policy futura seja mal configurada. Le o papel diretamente de
-- public.profiles (nao confia so na claim do JWT) para maior robustez.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_client_financial_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_role public.user_role;
begin
  select role into requester_role from public.profiles where id = auth.uid();

  if requester_role = 'client' then
    raise exception 'Clientes nao podem alterar lancamentos financeiros diretamente.'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_prevent_client_financial_write on public.financial_entries;
create trigger trg_prevent_client_financial_write
  before insert or update or delete on public.financial_entries
  for each row execute function public.prevent_client_financial_write();

-- ---------------------------------------------------------------------------
-- Uploads de cliente nunca podem ser marcados confidenciais nem ficar ocultos
-- do proprio cliente que os enviou.
-- ---------------------------------------------------------------------------
create or replace function public.stamp_document_upload()
returns trigger
language plpgsql
as $$
begin
  if new.uploaded_by_role = 'client' then
    new.is_confidential = false;
    new.is_visible_to_client = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_document_upload on public.documents;
create trigger trg_stamp_document_upload
  before insert on public.documents
  for each row execute function public.stamp_document_upload();

-- ---------------------------------------------------------------------------
-- Impede que um cliente altere seu proprio papel/status de ativacao via
-- update direto (mesmo que uma policy de UPDATE em profiles exista para
-- "dados cadastrais permitidos").
-- ---------------------------------------------------------------------------
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_role public.user_role;
begin
  select role into requester_role from public.profiles where id = auth.uid();

  if requester_role is distinct from 'admin' then
    if new.role is distinct from old.role then
      raise exception 'Somente administradores podem alterar o papel de um usuario.'
        using errcode = '42501';
    end if;
    if new.is_active is distinct from old.is_active
       or new.blocked_at is distinct from old.blocked_at
       or new.blocked_reason is distinct from old.blocked_reason then
      raise exception 'Somente administradores podem bloquear/desbloquear usuarios.'
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
