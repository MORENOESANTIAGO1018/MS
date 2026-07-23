#!/usr/bin/env bash
# Roda a suite de migrations + seed + prova de isolamento de RLS contra um
# Postgres descartavel. Pensado para:
#   (a) este ambiente sandbox, usando o Postgres do sistema operacional; ou
#   (b) CI, apontando SUPABASE_DB_URL/PGHOST/etc. para um Postgres efemero.
#
# Uso local (Postgres do SO, rodando como usuario com sudo/psql via peer auth):
#   sudo service postgresql start
#   ./supabase/tests/run-local.sh
#
# NAO rodar bootstrap_local_auth_stub.sql contra um projeto Supabase real —
# ver supabase/local-dev/README.md.

set -euo pipefail

DB_NAME="${RLS_TEST_DB_NAME:-portal_rls_test}"
PSQL_RUNNER="${PSQL_RUNNER:-su postgres -c}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_psql() {
  local sql_file="$1"
  su postgres -c "psql -v ON_ERROR_STOP=1 -d ${DB_NAME} -f ${sql_file}"
}

echo "==> Recriando banco de teste ${DB_NAME}"
su postgres -c "psql -c 'DROP DATABASE IF EXISTS ${DB_NAME};'"
su postgres -c "psql -c 'CREATE DATABASE ${DB_NAME};'"

echo "==> Bootstrap local de auth (apenas sandbox sem Supabase CLI)"
run_psql "${ROOT_DIR}/supabase/local-dev/bootstrap_local_auth_stub.sql"

echo "==> Aplicando migrations"
for f in "${ROOT_DIR}"/supabase/migrations/*.sql; do
  echo "    - $(basename "$f")"
  run_psql "$f"
done

echo "==> Carregando seed ficticio"
run_psql "${ROOT_DIR}/supabase/seed/seed_fictitious.sql"

echo "==> Rodando prova de isolamento de RLS"
run_psql "${ROOT_DIR}/supabase/tests/rls_isolation.sql"

echo "==> Limpando banco de teste"
su postgres -c "psql -c 'DROP DATABASE IF EXISTS ${DB_NAME};'"

echo "==> OK: migrations validas e isolamento de RLS comprovado."
