# Como validar este schema localmente (sandbox sem Supabase CLI)

Este diretório é um entregável autônomo — não faz parte das migrations já
aplicadas em `supabase/migrations/` (que já implementam um portal do cliente
completo com um design ligeiramente diferente, ver nota abaixo). Os três
arquivos, em ordem:

1. `01_schema.sql` — schema completo (18 tabelas, RLS, triggers, índices).
2. `02_testes_acesso_cruzado.sql` — prova executável de isolamento entre clientes.
3. Este README.

## Rodando localmente (Postgres puro, sem Supabase real)

`01_schema.sql` assume que `auth.users`/`auth.uid()`/os papéis
`anon`/`authenticated`/`service_role` já existem — verdade em qualquer projeto
Supabase real, mas não num Postgres genérico. Para validar neste tipo de
ambiente (como o sandbox usado nesta sessão), rode primeiro o stub já existente
no repositório:

```bash
sudo service postgresql start   # se ainda não estiver rodando
su postgres -c "psql -c 'DROP DATABASE IF EXISTS portal_juridico_teste;'"
su postgres -c "psql -c 'CREATE DATABASE portal_juridico_teste;'"
su postgres -c "psql -d portal_juridico_teste -f supabase/local-dev/bootstrap_local_auth_stub.sql"
su postgres -c "psql -v ON_ERROR_STOP=1 -d portal_juridico_teste -f supabase/schema-portal-juridico/01_schema.sql"
su postgres -c "psql -v ON_ERROR_STOP=1 -d portal_juridico_teste -f supabase/schema-portal-juridico/02_testes_acesso_cruzado.sql"
su postgres -c "psql -c 'DROP DATABASE IF EXISTS portal_juridico_teste;'"
```

`bootstrap_local_auth_stub.sql` é **apenas para este tipo de teste local** —
nunca rodar contra um projeto Supabase real (ele já tem `auth.*` de verdade).

## Nota sobre o design de `team_members` vs. o schema já existente no repositório

O schema já aplicado em `supabase/migrations/` (usado pela aplicação Next.js
deste repositório) resolve "quem é da equipe e a quem tem acesso" com uma
única tabela genérica (`client_access`, com `access_level` podendo ser
`owner`/`viewer`/`staff`), para não introduzir uma 19ª tabela além das 18
pedidas originalmente naquele projeto.

Esta tarefa pediu explicitamente `team_members` **e** `client_access` como
tabelas distintas — por isso este schema separa as duas: `team_members` é o
cadastro da equipe interna, e `client_access` vira uma tabela de atribuição
pura (liga um `team_member_id` a um `client_id`), enquanto o vínculo do
próprio cliente com seu login passa a ser direto (`clients.user_id`, único).
Isso é mais explícito para este caso de uso e não altera nada do aplicativo
já em produção neste repositório — este é um entregável novo e independente.
