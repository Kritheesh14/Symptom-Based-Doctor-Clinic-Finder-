#!/usr/bin/env bash
# Usage:  DATABASE_URL=... ./db/run_all.sh [--reset] [--no-seed]
#   --reset    DROP SCHEMA public CASCADE first (wipes everything, incl. legacy tables)
#   --no-seed  skip db/seed/seed.sql
set -euo pipefail
cd "$(dirname "$0")"
: "${DATABASE_URL:?Set DATABASE_URL (see .env.example)}"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

if [[ " $* " == *" --reset "* ]]; then
  echo ">> resetting schema public"
  "${PSQL[@]}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

for f in ddl/01_schema.sql ddl/02_alter_drop.sql advanced/fts.sql advanced/views.sql advanced/functions_triggers.sql; do
  echo ">> $f"; "${PSQL[@]}" -f "$f"
done
if [[ " $* " != *" --no-seed "* ]]; then
  echo ">> seed/seed.sql"; "${PSQL[@]}" -f seed/seed.sql
fi
echo "done."
