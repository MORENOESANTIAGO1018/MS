-- seed_fictitious.sql
-- Dados exclusivamente ficticios para desenvolvimento e para o teste de
-- isolamento de RLS (supabase/tests/rls_isolation.sql). Nunca usar dados
-- reais de cliente (regra inegociavel #12).

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'admin.teste@escritorio-ficticio.com'),
  ('00000000-0000-0000-0000-000000000002', 'advogado.teste@escritorio-ficticio.com'),
  ('00000000-0000-0000-0000-000000000003', 'clientea.teste@exemplo-ficticio.com'),
  ('00000000-0000-0000-0000-000000000004', 'clienteb.teste@exemplo-ficticio.com')
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name, email, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin Teste (fictício)', 'admin.teste@escritorio-ficticio.com', true),
  ('00000000-0000-0000-0000-000000000002', 'staff', 'Advogado Teste (fictício)', 'advogado.teste@escritorio-ficticio.com', true),
  ('00000000-0000-0000-0000-000000000003', 'client', 'Cliente A Teste (fictício)', 'clientea.teste@exemplo-ficticio.com', true),
  ('00000000-0000-0000-0000-000000000004', 'client', 'Cliente B Teste (fictício)', 'clienteb.teste@exemplo-ficticio.com', true)
on conflict (id) do nothing;

insert into public.clients (id, full_name, email, status, internal_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'Cliente A Teste (fictício)', 'clientea.teste@exemplo-ficticio.com', 'Cliente ativo', 'CLI-TEST-A'),
  ('00000000-0000-0000-0000-0000000000b1', 'Cliente B Teste (fictício)', 'clienteb.teste@exemplo-ficticio.com', 'Cliente ativo', 'CLI-TEST-B')
on conflict (id) do nothing;

-- Cliente A loga como ele mesmo; Cliente B loga como ele mesmo; staff so e
-- atribuido ao Cliente A (usado para provar que staff NAO ve o Cliente B).
insert into public.client_access (profile_id, client_id, access_level, is_active) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1', 'owner', true),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b1', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'staff', true)
on conflict (profile_id, client_id) do nothing;

-- Processos: um publicado e um NAO publicado por cliente, para testar a
-- visibilidade granular (is_visible_to_client).
insert into public.processes (id, client_id, process_number, status, is_visible_to_client, client_summary, internal_summary) values
  ('00000000-0000-0000-0000-0000000010a1', '00000000-0000-0000-0000-0000000000a1', '0000001-01.2024.8.26.0100 (fictício)', 'Ativo', true, 'Resumo publico A', 'Estrategia interna A - jamais exposta'),
  ('00000000-0000-0000-0000-0000000010a2', '00000000-0000-0000-0000-0000000000a1', '0000002-02.2024.8.26.0100 (fictício)', 'Ativo', false, 'Ainda nao publicado', 'Estrategia interna A2'),
  ('00000000-0000-0000-0000-0000000010b1', '00000000-0000-0000-0000-0000000000b1', '0000003-03.2024.8.26.0100 (fictício)', 'Ativo', true, 'Resumo publico B', 'Estrategia interna B - jamais exposta')
on conflict (id) do nothing;

insert into public.financial_entries (id, client_id, description, amount, due_date, status, is_visible_to_client) values
  ('00000000-0000-0000-0000-0000000020a1', '00000000-0000-0000-0000-0000000000a1', 'Parcela 1/1 Cliente A (fictício)', 1000.00, current_date + 10, 'pendente', true),
  ('00000000-0000-0000-0000-0000000020b1', '00000000-0000-0000-0000-0000000000b1', 'Parcela 1/1 Cliente B (fictício)', 2000.00, current_date + 10, 'pendente', true)
on conflict (id) do nothing;

insert into public.documents (id, client_id, name, storage_path, uploaded_by_role, size_bytes, mime_type, is_confidential, is_visible_to_client) values
  ('00000000-0000-0000-0000-0000000030a1', '00000000-0000-0000-0000-0000000000a1', 'Documento Público A (fictício)', 'clients/00000000-0000-0000-0000-0000000000a1/doc1.pdf', 'staff', 1024, 'application/pdf', false, true),
  ('00000000-0000-0000-0000-0000000030a2', '00000000-0000-0000-0000-0000000000a1', 'Documento Sigiloso A (fictício)', 'clients/00000000-0000-0000-0000-0000000000a1/doc2.pdf', 'staff', 2048, 'application/pdf', true, true),
  ('00000000-0000-0000-0000-0000000030b1', '00000000-0000-0000-0000-0000000000b1', 'Documento Público B (fictício)', 'clients/00000000-0000-0000-0000-0000000000b1/doc1.pdf', 'staff', 1024, 'application/pdf', false, true)
on conflict (id) do nothing;

-- Objetos de storage correspondentes (apenas para o stub local — em um
-- projeto Supabase real estas linhas sao criadas automaticamente pelo
-- proprio upload via Storage API).
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name) values
  ('documents', 'clients/00000000-0000-0000-0000-0000000000a1/doc1.pdf'),
  ('documents', 'clients/00000000-0000-0000-0000-0000000000a1/doc2.pdf'),
  ('documents', 'clients/00000000-0000-0000-0000-0000000000b1/doc1.pdf')
on conflict do nothing;
