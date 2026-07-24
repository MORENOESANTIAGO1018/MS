-- 0011_message_immutability_and_access_scoping.sql (teste)
-- Prova as 4 lacunas fechadas pela migration 0011. Depende apenas de
-- 0001..0011 aplicadas (nao depende do bucket de storage nem do seed
-- ficticio principal). Executar com:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/0011_message_immutability_and_access_scoping.sql

\set ON_ERROR_STOP on

\set admin_id '00000000-0000-0000-0000-0000000000a9'
\set staff_id '00000000-0000-0000-0000-0000000000a8'
\set client_a_contact_id '00000000-0000-0000-0000-0000000000a7'
\set client_a_id '00000000-0000-0000-0000-0000000000aa'
\set client_b_id '00000000-0000-0000-0000-0000000000bb'

-- ---------------------------------------------------------------------------
-- Fixtures (conexao padrao, superusuario local — ignora RLS, igual ao
-- padrao ja usado em supabase/seed/seed_fictitious.sql)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  (:'admin_id', 'admin-0011@teste.local'),
  (:'staff_id', 'staff-0011@teste.local'),
  (:'client_a_contact_id', 'cliente-a-0011@teste.local');

insert into public.profiles (id, role, full_name, email, is_active) values
  (:'admin_id', 'admin', 'Admin Teste', 'admin-0011@teste.local', true),
  (:'staff_id', 'staff', 'Staff Teste', 'staff-0011@teste.local', true),
  (:'client_a_contact_id', 'client', 'Contato Cliente A', 'cliente-a-0011@teste.local', true);

insert into public.clients (id, full_name, status, created_by) values
  (:'client_a_id', 'Cliente A Teste 0011', 'Ativo', :'admin_id'),
  (:'client_b_id', 'Cliente B Teste 0011', 'Ativo', :'admin_id');

insert into public.client_access (profile_id, client_id, access_level, is_active) values
  (:'client_a_contact_id', :'client_a_id', 'owner', true),
  (:'staff_id', :'client_a_id', 'staff', true);
-- nota: staff NAO tem client_access para client_b_id.

insert into public.messages (id, client_id, sender_profile_id, sender_role, body) values
  ('00000000-0000-0000-0000-0000000000c1', :'client_a_id', :'client_a_contact_id', 'client', 'Mensagem original do cliente A');

insert into public.support_requests (id, client_id, subject, body, status) values
  ('00000000-0000-0000-0000-0000000000c2', :'client_b_id', 'Duvida', 'Duvida do cliente B', 'Aberto');

-- ---------------------------------------------------------------------------
-- 1. Imutabilidade de mensagens: staff atribuido pode marcar read_at, mas
--    nao pode alterar body/sender_role/client_id.
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :'staff_id', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  update public.messages set read_at = now()
    where id = '00000000-0000-0000-0000-0000000000c1';
  raise notice 'PASS: staff atribuido conseguiu marcar read_at (permitido)';
end $$;

do $$
begin
  begin
    update public.messages set body = 'ADULTERADA'
      where id = '00000000-0000-0000-0000-0000000000c1';
    raise exception 'FALHA CRITICA: staff conseguiu adulterar o body de uma mensagem enviada';
  exception
    when sqlstate '42501' then
      raise notice 'PASS: alteracao do body de mensagem enviada foi bloqueada (42501)';
  end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ---------------------------------------------------------------------------
-- 2. support_requests_update_staff agora exige has_client_access: staff
--    atribuido so ao cliente A nao pode mais alterar solicitacao do cliente B.
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :'staff_id', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  update public.support_requests set status = 'Resolvido'
    where id = '00000000-0000-0000-0000-0000000000c2';
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Verificacao definitiva do estado real da linha (conexao sem RLS, ignora a
-- visibilidade do staff — prova que o UPDATE acima nao mudou nada de fato,
-- nao apenas que o staff deixou de enxergar a linha).
do $$
declare
  real_status text;
begin
  select status into real_status from public.support_requests
    where id = '00000000-0000-0000-0000-0000000000c2';

  if real_status is distinct from 'Aberto' then
    raise exception 'FALHA CRITICA: staff sem atribuicao ao cliente B conseguiu alterar sua solicitacao de suporte (status agora %)', real_status;
  end if;

  raise notice 'PASS: staff sem atribuicao ao cliente B nao conseguiu alterar solicitacao de suporte dele (status real permanece %)', real_status;
end $$;

-- ---------------------------------------------------------------------------
-- 3. notifications_insert_staff agora exige has_client_access quando
--    client_id != null: staff so pode notificar o cliente A (atribuido) ou
--    inserir notificacao interna sem client_id; nunca o cliente B.
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :'staff_id', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  insert into public.notifications (client_id, title, body) values
    (null, 'Aviso interno', 'Notificacao sem cliente associado');
  raise notice 'PASS: staff conseguiu inserir notificacao interna sem client_id (permitido)';
end $$;

do $$
begin
  insert into public.notifications (client_id, title, body) values
    ('00000000-0000-0000-0000-0000000000aa', 'Aviso cliente A', 'Notificacao para cliente atribuido');
  raise notice 'PASS: staff conseguiu notificar o cliente A (atribuido)';
end $$;

do $$
begin
  begin
    insert into public.notifications (client_id, title, body) values
      ('00000000-0000-0000-0000-0000000000bb', 'Aviso cliente B', 'Notificacao para cliente NAO atribuido');
    raise exception 'FALHA CRITICA: staff sem atribuicao conseguiu inserir notificacao para o cliente B';
  exception
    when sqlstate '42501' then
      raise notice 'PASS: insercao de notificacao para cliente nao atribuido foi bloqueada (42501)';
  end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ---------------------------------------------------------------------------
-- 4. financial_entries: constraints de valor e coerencia status/paid_at.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    insert into public.financial_entries (client_id, description, amount, due_date, status) values
      ('00000000-0000-0000-0000-0000000000aa', 'Valor negativo invalido', -10, current_date, 'pendente');
    raise exception 'FALHA CRITICA: constraint amount >= 0 nao bloqueou valor negativo';
  exception
    when check_violation then
      raise notice 'PASS: constraint bloqueou amount negativo';
  end;
end $$;

do $$
begin
  begin
    insert into public.financial_entries (client_id, description, amount, due_date, status, paid_at) values
      ('00000000-0000-0000-0000-0000000000aa', 'Pago sem paid_at', 100, current_date, 'pago', null);
    raise exception 'FALHA CRITICA: constraint status=pago sem paid_at nao bloqueou';
  exception
    when check_violation then
      raise notice 'PASS: constraint bloqueou status=pago com paid_at nulo';
  end;
end $$;

do $$
begin
  insert into public.financial_entries (client_id, description, amount, due_date, status, paid_at) values
    ('00000000-0000-0000-0000-0000000000aa', 'Pago valido', 100, current_date, 'pago', now());
  raise notice 'PASS: lancamento valido (status=pago com paid_at preenchido) foi aceito';
end $$;

\echo '=========================================='
\echo 'TODOS OS TESTES DA MIGRATION 0011 PASSARAM'
\echo '=========================================='
