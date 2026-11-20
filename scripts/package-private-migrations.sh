#!/usr/bin/env bash
set -euo pipefail

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
mkdir -p "$workdir"/{database/operations,scripts,node_modules}
cp scripts/private-migration-entry.mjs "$workdir/run.mjs"
cp scripts/{wait-postgres,single-company-preflight,migrate,migration-lock,check-db,schema-contract,retention-cleanup,report-snapshot-retention}.mjs "$workdir/scripts/"
cp database/schema-contract.json "$workdir/database/"
cp -R database/migrations "$workdir/database/"
cp database/operations/{single-company-preflight,ownerless-company-diagnostic}.sql "$workdir/database/operations/"
# Reuse the release package's physical, lockfile-resolved PostgreSQL driver.
for dependency in pg pg-cloudflare pg-connection-string pg-int8 pg-pool pg-protocol pg-types pgpass postgres-array postgres-bytea postgres-date postgres-interval split2 xtend; do
  cp -R "deploy/app/node_modules/$dependency" "$workdir/node_modules/"
done
(cd "$workdir" && node -e 'require("pg")')
tar -czf deploy/private-migrations.tar.gz -C "$workdir" run.mjs scripts database node_modules
cp scripts/private-migration-probe.mjs "$workdir/run.mjs"
tar -czf deploy/private-migration-probe.tar.gz -C "$workdir" run.mjs node_modules
