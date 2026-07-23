-- 0006_rls_policies.sql
-- Row Level Security em TODAS as tabelas (regra inegociavel #2).
-- service_role tem o atributo BYPASSRLS no Supabase e portanto ignora estas
-- policies automaticamente — usado apenas por Route Handlers/jobs de
-- sincronizacao no servidor (regras #3/#4).

-- ---------------------------------------------------------------------------
-- Funcao auxiliar adicional (staff so ve o profile de clientes aos quais
-- esta atribuido — usada na policy de SELECT de profiles).
-- ---------------------------------------------------------------------------
create or replace function public.staff_can_view_profile(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.client_access staff_ca
    join public.client_access client_ca
      on client_ca.client_id = staff_ca.client_id
    where staff_ca.profile_id = auth.uid()
      and staff_ca.access_level = 'staff'
      and staff_ca.is_active = true
      and client_ca.profile_id = p_profile_id
      and client_ca.is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using (public.is_admin() or id = auth.uid() or public.staff_can_view_profile(id));

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Sem policy de INSERT/DELETE para authenticated: profiles e criado pelo
-- trigger de provisionamento (auth.users -> profiles) ou pelo fluxo
-- administrativo via service_role. Cadastro publico permanece impossivel.

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
alter table public.team_members enable row level security;

create policy "team_members_select" on public.team_members
  for select to authenticated
  using (public.is_staff_or_admin());

create policy "team_members_update_self_or_admin" on public.team_members
  for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy "team_members_insert_admin" on public.team_members
  for insert to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
alter table public.clients enable row level security;

create policy "clients_select" on public.clients
  for select to authenticated
  using (public.is_admin() or public.has_client_access(id));

create policy "clients_insert_staff" on public.clients
  for insert to authenticated
  with check (public.is_staff_or_admin());

create policy "clients_update" on public.clients
  for update to authenticated
  using (
    public.is_admin()
    or (public.is_staff_or_admin() and public.has_client_access(id))
    or (public.current_profile_role() = 'client' and public.has_client_access(id))
  )
  with check (
    public.is_admin()
    or (public.is_staff_or_admin() and public.has_client_access(id))
    or (public.current_profile_role() = 'client' and public.has_client_access(id))
  );

-- Cliente so pode alterar email/telefone/whatsapp (retificacao LGPD) — demais
-- campos sao bloqueados por trigger, nao apenas pela policy acima.
create or replace function public.prevent_client_restricted_fields_update()
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
    if new.status is distinct from old.status
       or new.internal_code is distinct from old.internal_code
       or new.notion_page_id is distinct from old.notion_page_id
       or new.document_number_encrypted is distinct from old.document_number_encrypted
       or new.document_last4 is distinct from old.document_last4
       or new.archived_at is distinct from old.archived_at then
      raise exception 'Clientes so podem atualizar nome, e-mail, telefone e whatsapp.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_client_restricted_fields_update on public.clients;
create trigger trg_prevent_client_restricted_fields_update
  before update on public.clients
  for each row execute function public.prevent_client_restricted_fields_update();

-- ---------------------------------------------------------------------------
-- client_access
-- ---------------------------------------------------------------------------
alter table public.client_access enable row level security;

create policy "client_access_select" on public.client_access
  for select to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or (public.is_staff_or_admin() and public.has_client_access(client_id))
  );

create policy "client_access_insert_staff" on public.client_access
  for insert to authenticated
  with check (public.is_staff_or_admin());

create policy "client_access_update_staff" on public.client_access
  for update to authenticated
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ---------------------------------------------------------------------------
-- Macro para as tabelas de "caso" com o mesmo padrao de visibilidade:
-- admin ve tudo; staff atribuido ve tudo do cliente; cliente ve so o que
-- estiver marcado is_visible_to_client.
-- (processes, hearings, deadlines, contracts, financial_entries)
-- ---------------------------------------------------------------------------

-- processes
alter table public.processes enable row level security;

create policy "processes_select" on public.processes
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.has_client_access(client_id)
      and (public.current_profile_role() <> 'client' or is_visible_to_client)
    )
  );

create policy "processes_insert_staff" on public.processes
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "processes_update_staff" on public.processes
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- process_updates (andamentos) — cliente so ve publicados
alter table public.process_updates enable row level security;

create policy "process_updates_select" on public.process_updates
  for select to authenticated
  using (
    public.is_admin()
    or (
      public.has_client_access(client_id)
      and (
        public.current_profile_role() <> 'client'
        or (is_visible_to_client and published_at is not null)
      )
    )
  );

create policy "process_updates_insert_staff" on public.process_updates
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "process_updates_update_staff" on public.process_updates
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- hearings
alter table public.hearings enable row level security;

create policy "hearings_select" on public.hearings
  for select to authenticated
  using (
    public.is_admin()
    or (public.has_client_access(client_id) and (public.current_profile_role() <> 'client' or is_visible_to_client))
  );

create policy "hearings_insert_staff" on public.hearings
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "hearings_update_staff" on public.hearings
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- deadlines (informativos, cliente nunca escreve)
alter table public.deadlines enable row level security;

create policy "deadlines_select" on public.deadlines
  for select to authenticated
  using (
    public.is_admin()
    or (public.has_client_access(client_id) and (public.current_profile_role() <> 'client' or is_visible_to_client))
  );

create policy "deadlines_insert_staff" on public.deadlines
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "deadlines_update_staff" on public.deadlines
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- contracts
alter table public.contracts enable row level security;

create policy "contracts_select" on public.contracts
  for select to authenticated
  using (
    public.is_admin()
    or (public.has_client_access(client_id) and (public.current_profile_role() <> 'client' or is_visible_to_client))
  );

create policy "contracts_insert_staff" on public.contracts
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "contracts_update_staff" on public.contracts
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- financial_entries — cliente SOMENTE SELECT (reforcado por trigger na 0004)
alter table public.financial_entries enable row level security;

create policy "financial_entries_select" on public.financial_entries
  for select to authenticated
  using (
    public.is_admin()
    or (public.has_client_access(client_id) and (public.current_profile_role() <> 'client' or is_visible_to_client))
  );

create policy "financial_entries_insert_staff" on public.financial_entries
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "financial_entries_update_staff" on public.financial_entries
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

create policy "financial_entries_delete_admin" on public.financial_entries
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- documents — cliente pode INSERT (upload proprio) e SELECT (exclui
-- confidenciais); staff/admin gerenciam tudo.
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;

create policy "documents_select" on public.documents
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

create policy "documents_insert" on public.documents
  for insert to authenticated
  with check (
    public.has_client_access(client_id)
    and (
      (public.current_profile_role() = 'client' and uploaded_by_role = 'client')
      or (public.is_staff_or_admin() and uploaded_by_role = 'staff')
    )
  );

create policy "documents_update_staff" on public.documents
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- ---------------------------------------------------------------------------
-- messages — canal bidirecional, sempre visivel a quem tem acesso ao cliente
-- ---------------------------------------------------------------------------
alter table public.messages enable row level security;

create policy "messages_select" on public.messages
  for select to authenticated
  using (public.is_admin() or public.has_client_access(client_id));

create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    sender_profile_id = auth.uid()
    and public.has_client_access(client_id)
    and (
      (public.current_profile_role() = 'client' and sender_role = 'client')
      or (public.is_staff_or_admin() and sender_role = 'staff')
    )
  );

create policy "messages_update_read_receipt" on public.messages
  for update to authenticated
  using (public.is_admin() or public.has_client_access(client_id))
  with check (public.is_admin() or public.has_client_access(client_id));

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select" on public.notifications
  for select to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or (client_id is not null and public.has_client_access(client_id))
  );

create policy "notifications_insert_staff" on public.notifications
  for insert to authenticated
  with check (public.is_staff_or_admin());

create policy "notifications_update_mark_read" on public.notifications
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

-- ---------------------------------------------------------------------------
-- support_requests
-- ---------------------------------------------------------------------------
alter table public.support_requests enable row level security;

create policy "support_requests_select" on public.support_requests
  for select to authenticated
  using (public.is_admin() or public.has_client_access(client_id));

create policy "support_requests_insert" on public.support_requests
  for insert to authenticated
  with check (
    public.has_client_access(client_id)
    and (public.current_profile_role() = 'client' or public.is_staff_or_admin())
  );

create policy "support_requests_update_staff" on public.support_requests
  for update to authenticated
  using (public.is_admin() or public.is_staff_or_admin())
  with check (public.is_admin() or public.is_staff_or_admin());

-- ---------------------------------------------------------------------------
-- ai_summaries — cliente NUNCA le diretamente (regra inegociavel #10)
-- ---------------------------------------------------------------------------
alter table public.ai_summaries enable row level security;

create policy "ai_summaries_select_staff" on public.ai_summaries
  for select to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

create policy "ai_summaries_insert_staff" on public.ai_summaries
  for insert to authenticated
  with check (public.is_staff_or_admin() and public.has_client_access(client_id));

create policy "ai_summaries_update_staff" on public.ai_summaries
  for update to authenticated
  using (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)))
  with check (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(client_id)));

-- ---------------------------------------------------------------------------
-- access_logs / audit_logs / notion_sync_logs — somente leitura por admin;
-- INSERT apenas via service_role (nenhuma policy de INSERT para authenticated
-- => negado por padrao do RLS).
-- ---------------------------------------------------------------------------
alter table public.access_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notion_sync_logs enable row level security;

create policy "access_logs_select_admin" on public.access_logs
  for select to authenticated
  using (public.is_admin());

create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

create policy "notion_sync_logs_select_admin" on public.notion_sync_logs
  for select to authenticated
  using (public.is_admin());
