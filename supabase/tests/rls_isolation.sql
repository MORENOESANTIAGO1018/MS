-- rls_isolation.sql
-- Prova de isolamento de RLS entre clientes (regra inegociavel #1).
-- Executar com: psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql
-- Depende de supabase/seed/seed_fictitious.sql ja carregado.
--
-- Em um projeto Supabase real, auth.uid()/auth.role() e os papeis
-- anon/authenticated/service_role ja existem — este script funciona sem
-- alteracoes. Neste sandbox, supabase/local-dev/bootstrap_local_auth_stub.sql
-- fornece os mesmos objetos.

\set ON_ERROR_STOP on

-- ids ficticios do seed
\set client_a_id '00000000-0000-0000-0000-0000000000a1'
\set client_b_id '00000000-0000-0000-0000-0000000000b1'
\set profile_client_a '00000000-0000-0000-0000-000000000003'
\set profile_client_b '00000000-0000-0000-0000-000000000004'
\set profile_staff '00000000-0000-0000-0000-000000000002'
\set profile_admin '00000000-0000-0000-0000-000000000001'

-- ===========================================================================
-- 1. Cliente A: deve ver APENAS seus proprios dados
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', :'profile_client_a', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_clients int;
  visible_processes int;
  visible_financial int;
  visible_documents int;
  visible_confidential int;
begin
  select count(*) into visible_clients from public.clients;
  if visible_clients <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 cliente (o proprio), viu %', visible_clients;
  end if;

  select count(*) into visible_processes from public.processes;
  if visible_processes <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 processo publicado (nao o nao-publicado, nao o do cliente B), viu %', visible_processes;
  end if;

  select count(*) into visible_financial from public.financial_entries;
  if visible_financial <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 lancamento financeiro (o proprio), viu %', visible_financial;
  end if;

  select count(*) into visible_documents from public.documents;
  if visible_documents <> 1 then
    raise exception 'FALHA: cliente A deveria ver exatamente 1 documento (publico, nao o sigiloso), viu %', visible_documents;
  end if;

  select count(*) into visible_confidential from public.documents where is_confidential = true;
  if visible_confidential <> 0 then
    raise exception 'FALHA: cliente A NAO deveria ver nenhum documento sigiloso, viu %', visible_confidential;
  end if;

  raise notice 'PASS: cliente A ve somente seus proprios dados publicados (isolamento OK)';
end $$;

-- Cliente A nao pode escrever em financial_entries mesmo que tente. A
-- protecao pode se manifestar de duas formas validas: (a) a policy de UPDATE
-- ja nega a linha para o papel client, entao 0 linhas sao afetadas
-- silenciosamente; ou (b) o trigger prevent_client_financial_write dispara
-- excecao 42501. Ambas as formas significam "cliente nao conseguiu alterar".
-- (nota: dentro de blocos DO $$...$$ o psql NAO interpola variaveis :'nome',
-- por isso os UUIDs ficticios do seed sao repetidos como literais abaixo)
do $$
declare
  amount_before numeric;
  amount_after numeric;
begin
  select amount into amount_before from public.financial_entries
    where client_id = '00000000-0000-0000-0000-0000000000a1';

  begin
    update public.financial_entries set amount = 999999
      where client_id = '00000000-0000-0000-0000-0000000000a1';
  exception
    when sqlstate '42501' then
      null; -- bloqueado pelo trigger, como esperado
  end;

  select amount into amount_after from public.financial_entries
    where client_id = '00000000-0000-0000-0000-0000000000a1';

  if amount_after is distinct from amount_before then
    raise exception 'FALHA CRITICA: cliente A conseguiu alterar valor financeiro de % para %', amount_before, amount_after;
  end if;

  raise notice 'PASS: cliente A nao conseguiu alterar lancamento financeiro (valor permaneceu %)', amount_before;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================
-- 2. Cliente B: deve ver APENAS seus proprios dados (nunca os do cliente A)
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', :'profile_client_b', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_clients int;
  sees_client_a int;
  visible_processes int;
  sees_process_a int;
begin
  select count(*) into visible_clients from public.clients;
  if visible_clients <> 1 then
    raise exception 'FALHA: cliente B deveria ver exatamente 1 cliente (o proprio), viu %', visible_clients;
  end if;

  select count(*) into sees_client_a from public.clients
    where id = '00000000-0000-0000-0000-0000000000a1';
  if sees_client_a <> 0 then
    raise exception 'FALHA CRITICA: cliente B conseguiu ver o registro do cliente A';
  end if;

  select count(*) into visible_processes from public.processes;
  if visible_processes <> 1 then
    raise exception 'FALHA: cliente B deveria ver exatamente 1 processo (o proprio publicado), viu %', visible_processes;
  end if;

  select count(*) into sees_process_a from public.processes
    where client_id = '00000000-0000-0000-0000-0000000000a1';
  if sees_process_a <> 0 then
    raise exception 'FALHA CRITICA: cliente B conseguiu ver processo do cliente A';
  end if;

  raise notice 'PASS: cliente B nao ve nenhum dado do cliente A (isolamento cruzado OK)';
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================
-- 3. Staff atribuido ao Cliente A: ve tudo do A (inclusive nao publicado),
--    nada do Cliente B (nao atribuido)
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', :'profile_staff', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_processes_a int;
  visible_processes_b int;
  visible_confidential_a int;
begin
  select count(*) into visible_processes_a from public.processes
    where client_id = '00000000-0000-0000-0000-0000000000a1';
  if visible_processes_a <> 2 then
    raise exception 'FALHA: staff atribuido ao cliente A deveria ver os 2 processos (publicado e nao publicado), viu %', visible_processes_a;
  end if;

  select count(*) into visible_processes_b from public.processes
    where client_id = '00000000-0000-0000-0000-0000000000b1';
  if visible_processes_b <> 0 then
    raise exception 'FALHA CRITICA: staff nao atribuido ao cliente B conseguiu ver processo do cliente B';
  end if;

  select count(*) into visible_confidential_a from public.documents
    where client_id = '00000000-0000-0000-0000-0000000000a1' and is_confidential = true;
  if visible_confidential_a <> 1 then
    raise exception 'FALHA: staff atribuido deveria ver o documento sigiloso do cliente A, viu %', visible_confidential_a;
  end if;

  raise notice 'PASS: staff ve integralmente o cliente atribuido e nada do cliente nao atribuido';
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================
-- 4. Admin: ve tudo
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', :'profile_admin', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  total_clients int;
  total_processes int;
begin
  select count(*) into total_clients from public.clients;
  if total_clients <> 2 then
    raise exception 'FALHA: admin deveria ver os 2 clientes ficticios, viu %', total_clients;
  end if;

  select count(*) into total_processes from public.processes;
  if total_processes <> 3 then
    raise exception 'FALHA: admin deveria ver os 3 processos ficticios, viu %', total_processes;
  end if;

  raise notice 'PASS: admin ve todos os registros';
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================
-- 5. Papel anonimo (sem autenticacao): nao ve nada
-- ===========================================================================
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);

do $$
declare
  visible int;
begin
  begin
    select count(*) into visible from public.clients;
  exception when insufficient_privilege then
    visible := 0;
  end;
  if visible <> 0 then
    raise exception 'FALHA CRITICA: usuario anonimo conseguiu ver % registros de clientes', visible;
  end if;
  raise notice 'PASS: usuario anonimo nao ve nenhum dado de cliente';
end $$;

reset role;

\echo '=========================================='
\echo 'TODOS OS TESTES DE ISOLAMENTO DE RLS PASSARAM'
\echo '=========================================='
