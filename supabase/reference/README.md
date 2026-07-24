# supabase/reference/

Rascunhos de schema que **não fazem parte da cadeia de migrations aplicada**
(`supabase/migrations/0001..0011`) e que **nunca devem ser executados** contra
o projeto Supabase deste repositório, nem contra um projeto Supabase separado
criado só para esse fim.

## `001_initial_schema.DO_NOT_APPLY.sql`

Rascunho standalone de um schema alternativo de 18 tabelas para um portal
jurídico, escrito antes da reconciliação com `supabase/migrations/`. Foi
comparado tabela a tabela com o schema já aplicado (0001-0010) — a
comparação completa está no relatório de reconciliação apresentado ao
usuário. Divergências relevantes: sem soft-delete (`archived_at`), sem o
ciclo de ativação/convite em `client_access`, `clients.user_id` direto (o
schema real não tem essa coluna — acesso é só via `client_access`), colunas
diferentes em `team_members`/`contracts`/`financial_entries`/`documents`, uso
de `CHECK` em vez dos tipos `enum` já existentes.

As poucas lacunas de segurança genuínas identificadas neste rascunho que não
existiam no schema real foram portadas como migration incremental
(`0011_message_immutability_and_access_scoping.sql`), sem duplicar nada.
Este arquivo fica aqui só como referência histórica/comparação — mantenha-o
fora de `supabase/migrations/` para nenhuma ferramenta de migration
(Supabase CLI, `psql -f` em lote, etc.) executá-lo por engano.
