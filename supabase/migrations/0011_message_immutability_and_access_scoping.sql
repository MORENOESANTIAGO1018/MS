-- 0011_message_immutability_and_access_scoping.sql
-- Reconciliacao entre o schema em producao (0001-0010) e o rascunho
-- supabase/reference/001_initial_schema.sql (nunca aplicado). Este arquivo
-- so contem lacunas de seguranca genuinas e aditivas, confirmadas contra o
-- codigo Next.js existente (nenhuma delas e usada por um caminho legitimo do
-- app com um valor que passaria a ser rejeitado):
--
--   1. messages: nenhum gatilho impedia alterar body/sender/client_id de uma
--      mensagem ja enviada — a policy "messages_update_read_receipt" (0006)
--      permite UPDATE completo da linha, contando apenas com a boa-fe do
--      cliente Supabase usado pelo app. src/modules/messages/actions.server.ts
--      (markMessagesAsRead) so altera read_at; nunca body/sender_role/
--      client_id/created_at. Endurecemos via trigger, sem tocar a policy.
--
--   2. support_requests_update_staff (0006): permite que QUALQUER staff/admin
--      atualize a solicitacao de QUALQUER cliente, sem checar
--      has_client_access(client_id). Nenhuma acao do app (src/modules/support)
--      atualiza support_requests hoje — e seguro apertar o escopo.
--
--   3. notifications_insert_staff (0006): permite que qualquer staff insira
--      notificacao para qualquer client_id, sem has_client_access(). Todo
--      INSERT em notifications no app (deadlines/hearings/financial/
--      ai-summaries notify.actions.server.ts) usa o cliente service_role
--      (getSupabaseAdminClient), que ignora RLS — a policy so protege acesso
--      direto ao Supabase fora do app. Apertamos mantendo o caso legitimo de
--      notificacao sem client_id (aviso interno para um profile_id especifico).
--
--   4. financial_entries: nenhuma CHECK protegia amount/status. O app ja
--      impoe manualmente (src/modules/admin/actions.ts:updateFinancialStatus)
--      que status = 'pago' sempre venha com paid_at preenchido e que outros
--      status venham com paid_at nulo — a constraint so formaliza no banco o
--      que o app ja garante. amount >= 0 tambem nunca e violado pelo app.
--
-- Nada aqui cria tabela, funcao, trigger, indice ou policy que ja exista.
-- "messages_update_read_receipt", "support_requests_update_staff" e
-- "notifications_insert_staff" sao ajustadas com ALTER POLICY (mesmo objeto,
-- sem duplicar), preservando o nome e o registro de auditoria do Postgres.

-- ---------------------------------------------------------------------------
-- 1. Imutabilidade de mensagens: somente read_at (e updated_at, via trigger
--    generica set_updated_at ja existente) podem mudar apos o envio.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. support_requests_update_staff: restringe ao cliente atribuido ao staff.
-- ---------------------------------------------------------------------------
alter policy "support_requests_update_staff" on public.support_requests
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- ---------------------------------------------------------------------------
-- 3. notifications_insert_staff: restringe ao cliente atribuido ao staff,
--    preservando o caso legitimo de notificacao interna sem client_id.
-- ---------------------------------------------------------------------------
alter policy "notifications_insert_staff" on public.notifications
  with check (
    public.is_staff_or_admin()
    and (client_id is null or public.has_client_access(client_id))
  );

-- ---------------------------------------------------------------------------
-- 4. financial_entries: constraints de valor e coerencia status/paid_at.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.financial_entries'::regclass
      and conname = 'financial_entries_amount_non_negative'
  ) then
    alter table public.financial_entries
      add constraint financial_entries_amount_non_negative check (amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.financial_entries'::regclass
      and conname = 'financial_entries_paid_requires_paid_at'
  ) then
    alter table public.financial_entries
      add constraint financial_entries_paid_requires_paid_at
      check (status <> 'pago' or paid_at is not null);
  end if;
end $$;
