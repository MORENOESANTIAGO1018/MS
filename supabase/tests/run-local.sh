#!/usr/bin/env bash
# Roda a suite de migrations + seed + prova de isolamento de RLS contra um
# Postgres descartavel. Dois modos:
#   (a) local/sandbox: Postgres do sistema operacional, acessado via
#       "su postgres -c psql" (peer auth) — modo padrao, usado durante todo
#       o desenvolvimento deste projeto;
#   (b) CI: define TEST_DATABASE_URL apontando para um Postgres efemero
#       (ex.: servico do GitHub Actions, autenticacao por senha via TCP) —
#       quando essa variavel esta definida, o script usa "psql
#       $TEST_DATABASE_URL" em vez de "su postgres", sem precisar de root.
#
# NAO rodar bootstrap_local_auth_stub.sql contra um projeto Supabase real —
# ver supabase/local-dev/README.md.

set -euo pipefail

DB_NAME="${RLS_TEST_DB_NAME:-portal_rls_test}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [ -n "${TEST_DATABASE_URL:-}" ]; then
  echo "==> Modo CI: usando TEST_DATABASE_URL"
  ADMIN_URL="${TEST_DATABASE_URL}"
  TEST_DB_URL="${TEST_DATABASE_URL%/*}/${DB_NAME}"

  run_admin_psql() {
    psql -v ON_ERROR_STOP=1 "${ADMIN_URL}" -c "$1"
  }
  run_psql() {
    local sql_file="$1"
    psql -v ON_ERROR_STOP=1 "${TEST_DB_URL}" -f "${sql_file}"
  }
else
  echo "==> Modo local: usando 'su postgres' (peer auth)"
  run_admin_psql() {
    su postgres -c "psql -c \"$1\""
  }
  run_psql() {
    local sql_file="$1"
    su postgres -c "psql -v ON_ERROR_STOP=1 -d ${DB_NAME} -f ${sql_file}"
  }
fi

echo "==> Recriando banco de teste ${DB_NAME}"
run_admin_psql "DROP DATABASE IF EXISTS ${DB_NAME};"
run_admin_psql "CREATE DATABASE ${DB_NAME};"

echo "==> Bootstrap local de auth e storage (apenas sandbox sem Supabase CLI)"
run_psql "${ROOT_DIR}/supabase/local-dev/bootstrap_local_auth_stub.sql"
run_psql "${ROOT_DIR}/supabase/local-dev/bootstrap_local_storage_stub.sql"

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
run_admin_psql "DROP DATABASE IF EXISTS ${DB_NAME};"

echo "==> OK: migrations validas e isolamento de RLS comprovado."
