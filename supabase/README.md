# supabase/

## Em um projeto Supabase real (produção, staging, ou `supabase start` local via CLI)

```bash
# aplica todas as migrations, em ordem, contra o projeto linkado
supabase db push

# (opcional, apenas ambientes de desenvolvimento/staging) dados ficticios
psql "$SUPABASE_DB_URL" -f supabase/seed/seed_fictitious.sql

# prova de isolamento de RLS — funciona sem alteracoes, pois auth.uid()/papeis
# ja existem em qualquer projeto Supabase
psql "$SUPABASE_DB_URL" -f supabase/tests/rls_isolation.sql
```

## Neste ambiente de desenvolvimento (sandbox sem Docker/Supabase CLI)

Não há acesso a Docker, então não é possível rodar `supabase start`. Para ainda assim
validar de forma real (não apenas ler o SQL), usamos o PostgreSQL do sistema
operacional com um pequeno "stub" que recria `auth.uid()` e os papéis
`anon`/`authenticated`/`service_role` exatamente como o Supabase os disponibiliza:

```bash
sudo service postgresql start   # se ainda não estiver rodando
npm run db:test:rls             # supabase/tests/run-local.sh
```

Isso recria um banco `portal_rls_test` do zero, aplica todas as migrations, carrega o
seed fictício e roda `rls_isolation.sql`, que falha (`exit != 0`) se qualquer regra de
isolamento entre clientes for violada. Ver `supabase/local-dev/README.md` para
detalhes e o aviso de **nunca** rodar o stub contra um projeto Supabase real.

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `migrations/` | Schema completo, em ordem de aplicação |
| `seed/seed_fictitious.sql` | Dados fictícios para desenvolvimento e testes |
| `tests/rls_isolation.sql` | Prova de isolamento entre clientes |
| `tests/run-local.sh` | Automação da prova acima neste sandbox |
| `local-dev/` | Stub de `auth.*` — **apenas** para este sandbox |

Ver `MODELO-DE-DADOS.md` (raiz do repositório) para o desenho completo do schema.
