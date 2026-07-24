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

**Correção (pós-reconciliação):** a afirmação original desta seção — de que
o schema já aplicado não teria uma tabela `team_members` separada — estava
errada. `supabase/migrations/0002_core_tables.sql` já cria `team_members`
como tabela própria (colunas `oab`, `"position"`, `practice_areas`), distinta
de `client_access`. O que o schema real faz de fato é usar `client_access`
como tabela única de **acesso** (cobrindo tanto o próprio cliente quanto um
membro da equipe formalmente atribuído, via `access_level`
`owner`/`viewer`/`staff`) — sem uma coluna `clients.user_id` direta; e
`team_members` como **cadastro** da equipe, sem relação de atribuição
embutida nele (a atribuição staff→cliente é uma linha em `client_access`).

Este schema (`01_schema.sql`) usa um design diferente: `team_members` cadastro
+ `client_access` como tabela de atribuição pura (`team_member_id` →
`client_id`), com `clients.user_id` ligando o cliente diretamente ao seu
login. É um entregável novo e independente, que não altera nada do
aplicativo já em produção neste repositório — mas não é o mesmo modelo do
schema real, e as diferenças completas estão documentadas no relatório de
reconciliação (ver `supabase/reference/README.md` e a migration
`0011_message_immutability_and_access_scoping.sql`).
