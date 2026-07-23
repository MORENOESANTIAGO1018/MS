# supabase/local-dev

Este diretório existe **apenas** porque este ambiente de desenvolvimento não tem acesso
a Docker/Supabase CLI para rodar um projeto Supabase local completo. Para ainda assim
provar de forma real (não apenas "no papel") que as políticas de RLS funcionam, usamos
um PostgreSQL simples e recriamos aqui, de forma mínima, as partes do ambiente Supabase
que as migrations pressupõem:

- schema `auth` com uma tabela `auth.users` minimalista;
- função `auth.uid()` (lê `request.jwt.claim.sub` da sessão, exatamente como o
  Supabase faz);
- papéis `anon`, `authenticated`, `service_role` (o Supabase já os cria
  automaticamente em qualquer projeto real);
- schema `storage` mínimo (`storage.buckets`, `storage.objects`,
  `storage.foldername()`), usado apenas para validar a sintaxe e a lógica das
  policies de `supabase/migrations/0009_storage.sql`.

**Nunca execute `bootstrap_local_auth_stub.sql` ou `bootstrap_local_storage_stub.sql`
contra um projeto Supabase real** — lá esses objetos já existem, gerenciados pela
plataforma, e estes scripts entrariam em conflito com eles. Servem exclusivamente para
rodar `supabase/tests/rls_isolation.sql` neste ambiente sandbox.

Em um projeto Supabase real (ou `supabase start` local via CLI/Docker), basta rodar as
migrations em `supabase/migrations/` normalmente — este diretório é irrelevante nesse
cenário.
