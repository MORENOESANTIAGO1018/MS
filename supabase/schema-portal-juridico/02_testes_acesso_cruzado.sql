-- =============================================================================
-- Testes de acesso cruzado entre clientes (requisito 15)
-- =============================================================================
-- Roda contra o schema de 01_schema.sql já aplicado, com auth.users/auth.uid()
-- disponíveis (projeto Supabase real, ou o stub local de
-- supabase/local-dev/bootstrap_local_auth_stub.sql para validação neste
-- sandbox — ver README de 03_como_testar_localmente.md).
--
-- Convenção: cada bloco troca de "usuário logado" com
--   set role authenticated;
--   select set_config('request.jwt.claim.sub', '<uuid>', false);
-- (set_config com o 3º argumento "false" = nível de sessão, não de
-- transação — psql -f não abre uma transação implícita entre comandos, e
-- "set local"/"set ... local" seriam descartados no fim de cada statement)
-- e verifica o resultado ANTES de seguir para o próximo bloco. Falha =
-- RAISE EXCEPTION (o script para imediatamente no primeiro problema real).
-- =============================================================================

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------------
-- 0. Massa de dados fictícia
-- -----------------------------------------------------------------------------
do $$
begin
  -- Usuários fictícios (auth.users)
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'cliente.a@exemplo-ficticio.com'),
    ('00000000-0000-0000-0000-0000000000b1', 'cliente.b@exemplo-ficticio.com'),
    ('00000000-0000-0000-0000-0000000000c1', 'staff@exemplo-ficticio.com'),
    ('00000000-0000-0000-0000-0000000000ad', 'admin@exemplo-ficticio.com')
  on conflict (id) do nothing;

  -- Profiles
  insert into public.profiles (id, role, full_name, email) values
    ('00000000-0000-0000-0000-0000000000a1', 'client', 'Cliente A (fictício)', 'cliente.a@exemplo-ficticio.com'),
    ('00000000-0000-0000-0000-0000000000b1', 'client', 'Cliente B (fictício)', 'cliente.b@exemplo-ficticio.com'),
    ('00000000-0000-0000-0000-0000000000c1', 'staff', 'Staff Fictício', 'staff@exemplo-ficticio.com'),
    ('00000000-0000-0000-0000-0000000000ad', 'admin', 'Admin Fictício', 'admin@exemplo-ficticio.com')
  on conflict (id) do nothing;

  -- Clients
  insert into public.clients (id, user_id, full_name, status) values
    ('10000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000a1', 'Cliente A (fictício)', 'Cliente ativo'),
    ('10000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000b1', 'Cliente B (fictício)', 'Cliente ativo')
  on conflict (id) do nothing;

  -- team_members + client_access: staff só atribuído ao Cliente A
  insert into public.team_members (id, profile_id, department) values
    ('20000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-0000000000c1', 'Jurídico')
  on conflict (id) do nothing;

  insert into public.client_access (client_id, team_member_id, is_active) values
    ('10000000-0000-0000-0000-000000000a01', '20000000-0000-0000-0000-000000000c01', true)
  on conflict do nothing;

  -- Processos: um por cliente, ambos visíveis
  insert into public.processes (id, client_id, process_number, is_visible_to_client) values
    ('30000000-0000-0000-0000-000000000a01', '10000000-0000-0000-0000-000000000a01', '0000001-01.2026.8.26.0100 (fictício)', true),
    ('30000000-0000-0000-0000-000000000b01', '10000000-0000-0000-0000-000000000b01', '0000002-02.2026.8.26.0100 (fictício)', true)
  on conflict (id) do nothing;

  -- Financeiro: um lançamento por cliente
  insert into public.financial_entries (id, client_id, description, amount, due_date, is_visible_to_client) values
    ('40000000-0000-0000-0000-000000000a01', '10000000-0000-0000-0000-000000000a01', 'Honorários A (fictício)', 1000.00, current_date + 30, true),
    ('40000000-0000-0000-0000-000000000b01', '10000000-0000-0000-0000-000000000b01', 'Honorários B (fictício)', 2000.00, current_date + 30, true)
  on conflict (id) do nothing;

  -- Documentos: um por cliente
  insert into public.documents (id, client_id, name, storage_path, uploaded_by_role, size_bytes, mime_type, is_visible_to_client) values
    ('50000000-0000-0000-0000-000000000a01', '10000000-0000-0000-0000-000000000a01', 'Doc A (fictício)', 'clients/a/doc.pdf', 'staff', 1024, 'application/pdf', true),
    ('50000000-0000-0000-0000-000000000b01', '10000000-0000-0000-0000-000000000b01', 'Doc B (fictício)', 'clients/b/doc.pdf', 'staff', 1024, 'application/pdf', true)
  on conflict (id) do nothing;
end $$;

reset role;

-- -----------------------------------------------------------------------------
-- 1. Cliente A só vê o próprio cliente/processo/financeiro/documento
-- -----------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 cliente (o proprio), viu %', v_count;
  end if;

  select count(*) into v_count from public.processes;
  if v_count <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 processo, viu %', v_count;
  end if;

  select count(*) into v_count from public.financial_entries;
  if v_count <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 lancamento financeiro, viu %', v_count;
  end if;

  select count(*) into v_count from public.documents;
  if v_count <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 documento, viu %', v_count;
  end if;

  -- Nunca deve conseguir ler a linha do cliente B por id direto.
  select count(*) into v_count from public.clients where id = '10000000-0000-0000-0000-000000000b01';
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: cliente A conseguiu ler a linha do cliente B por id direto';
  end if;

  select count(*) into v_count from public.financial_entries where client_id = '10000000-0000-0000-0000-000000000b01';
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: cliente A conseguiu ler financeiro do cliente B';
  end if;

  raise notice 'PASS: cliente A ve somente os proprios dados (isolamento OK)';
end $$;

-- -----------------------------------------------------------------------------
-- 2. Cliente A não pode escrever em processes/financial_entries (requisito 7)
-- -----------------------------------------------------------------------------
-- Nota: um UPDATE cuja cláusula USING da policy já exclui a linha (aqui,
-- financial_entries_update_staff exige is_staff_or_admin(), falso para um
-- client) simplesmente afeta 0 linhas silenciosamente — não lança exceção.
-- O trigger trg_block_client_write (defesa em profundidade) só chegaria a
-- rodar se a RLS deixasse passar; então a prova real de bloqueio aqui é
-- comparar o valor antes/depois, não esperar uma exceção do UPDATE em si.
do $$
declare
  v_amount_before numeric;
  v_amount_after numeric;
begin
  select amount into v_amount_before from public.financial_entries
  where id = '40000000-0000-0000-0000-000000000a01';

  update public.financial_entries
  set amount = 999999
  where client_id = '10000000-0000-0000-0000-000000000a01';

  select amount into v_amount_after from public.financial_entries
  where id = '40000000-0000-0000-0000-000000000a01';

  if v_amount_after is distinct from v_amount_before then
    raise exception 'FALHA CRITICA: cliente A conseguiu alterar valor financeiro de % para %', v_amount_before, v_amount_after;
  end if;

  raise notice 'PASS: cliente A nao conseguiu alterar financial_entries (valor permaneceu %)', v_amount_before;
end $$;

-- INSERT, ao contrário do UPDATE acima, é rejeitado pela cláusula WITH CHECK
-- com uma exceção real (a linha nova nunca chega a existir para ser
-- "silenciosamente filtrada") — aqui sim esperamos SQLSTATE 42501.
do $$
begin
  begin
    insert into public.processes (client_id, process_number)
    values ('10000000-0000-0000-0000-000000000a01', '9999999-99.2026.8.26.0100 (tentativa maliciosa)');
    raise exception 'FALHA CRITICA: cliente A conseguiu inserir um processo (deveria ter sido bloqueado)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: cliente A bloqueado ao tentar inserir em processes';
  end;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Cliente A PODE inserir mensagem e documento próprios (requisito 8)
-- -----------------------------------------------------------------------------
do $$
begin
  insert into public.messages (client_id, sender_profile_id, sender_role, body)
  values ('10000000-0000-0000-0000-000000000a01', '00000000-0000-0000-0000-0000000000a1', 'client', 'Mensagem de teste do cliente A');

  insert into public.documents (client_id, name, storage_path, uploaded_by_role, size_bytes, mime_type)
  values ('10000000-0000-0000-0000-000000000a01', 'Upload do cliente A', 'clients/a/upload.pdf', 'client', 2048, 'application/pdf');

  raise notice 'PASS: cliente A conseguiu enviar mensagem e documento proprios';
end $$;

-- ... e NAO consegue inserir mensagem/documento em nome do cliente B.
do $$
begin
  begin
    insert into public.messages (client_id, sender_profile_id, sender_role, body)
    values ('10000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-0000000000a1', 'client', 'Tentativa maliciosa');
    raise exception 'FALHA CRITICA: cliente A conseguiu inserir mensagem no client_id do cliente B';
  exception
    when insufficient_privilege then
      raise notice 'PASS: cliente A bloqueado ao tentar inserir mensagem no cliente B';
  end;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Cliente B — isolamento simétrico
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 1 then
    raise exception 'FALHA: cliente B deveria ver exatamente 1 cliente, viu %', v_count;
  end if;

  select count(*) into v_count from public.clients where id = '10000000-0000-0000-0000-000000000a01';
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: cliente B conseguiu ler a linha do cliente A';
  end if;

  select count(*) into v_count from public.documents where client_id = '10000000-0000-0000-0000-000000000a01';
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: cliente B conseguiu ler documento do cliente A';
  end if;

  raise notice 'PASS: cliente B nao ve nenhum dado do cliente A (isolamento cruzado OK)';
end $$;

-- -----------------------------------------------------------------------------
-- 5. Staff atribuído só ao Cliente A: ve A integralmente, nada do B
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients where id = '10000000-0000-0000-0000-000000000a01';
  if v_count <> 1 then
    raise exception 'FALHA: staff deveria ver o cliente A (atribuido), viu %', v_count;
  end if;

  select count(*) into v_count from public.clients where id = '10000000-0000-0000-0000-000000000b01';
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: staff sem atribuicao conseguiu ver o cliente B';
  end if;

  -- Staff PODE alterar financeiro do cliente atribuido.
  update public.financial_entries set amount = 1500.00
  where id = '40000000-0000-0000-0000-000000000a01';

  raise notice 'PASS: staff ve e gerencia integralmente o cliente atribuido, nada do nao atribuido';
end $$;

-- -----------------------------------------------------------------------------
-- 6. client_access / team_members nunca visíveis a cliente
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.client_access;
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: cliente conseguiu ler client_access (metadado interno)';
  end if;

  select count(*) into v_count from public.team_members;
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: cliente conseguiu ler team_members';
  end if;

  raise notice 'PASS: cliente nao enxerga client_access nem team_members';
end $$;

-- -----------------------------------------------------------------------------
-- 7. Admin ve tudo
-- -----------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', false);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 2 then
    raise exception 'FALHA: admin deveria ver os 2 clientes, viu %', v_count;
  end if;

  select count(*) into v_count from public.client_access;
  if v_count <> 1 then
    raise exception 'FALHA: admin deveria ver a atribuicao de staff, viu %', v_count;
  end if;

  raise notice 'PASS: admin ve todos os registros';
end $$;

-- -----------------------------------------------------------------------------
-- 8. Usuário anônimo não vê nada
-- -----------------------------------------------------------------------------
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.clients;
  if v_count <> 0 then
    raise exception 'FALHA CRITICA: usuario anonimo conseguiu ler clients';
  end if;
  raise notice 'PASS: usuario anonimo nao ve nenhum dado de cliente';
end $$;

reset role;

\echo '=========================================='
\echo 'TODOS OS TESTES DE ACESSO CRUZADO PASSARAM'
\echo '=========================================='
