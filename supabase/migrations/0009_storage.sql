-- 0009_storage.sql
-- Bucket privado de documentos + RLS em storage.objects. Caminho convencionado:
-- clients/<client_id>/<uuid>-<nome-do-arquivo>. Nenhum bucket publico e usado
-- (regra da Fase 9: "nao utilize links publicos permanentes").
--
-- NOTA: este arquivo depende do schema `storage` que so existe em um projeto
-- Supabase real (hospedado ou via `supabase start`). Nao ha stub local para
-- storage.* neste sandbox — validar esta migration especificamente contra um
-- projeto Supabase real antes de producao (ver CHECKLIST-DE-PRODUCAO.md).

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Leitura: mesma regra de visibilidade da tabela public.documents.
create policy "documents_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and (
          public.is_admin()
          or (
            public.has_client_access(d.client_id)
            and (
              public.current_profile_role() <> 'client'
              or (d.is_visible_to_client and not d.is_confidential)
            )
          )
        )
    )
  );

-- Upload: o primeiro segmento do caminho deve ser "clients" e o segundo deve
-- ser um client_id ao qual o usuario tem acesso ativo.
create policy "documents_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'clients'
    and public.has_client_access(((storage.foldername(name))[2])::uuid)
  );

-- Exclusao: somente staff/admin atribuido ao cliente (cliente nunca apaga
-- documento do bucket diretamente).
create policy "documents_storage_delete_staff" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and (public.is_admin() or (public.is_staff_or_admin() and public.has_client_access(d.client_id)))
    )
  );
