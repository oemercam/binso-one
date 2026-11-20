import {spawnSync} from 'node:child_process';

const steps = [
  ['wait-postgres.mjs'],
  ['single-company-preflight.mjs'],
  ['migrate.mjs'],
  ['check-db.mjs'],
  ['retention-cleanup.mjs', {RETENTION_DRY_RUN: 'true'}],
];

for (const [script, settings] of steps) {
  const result = spawnSync(process.execPath, ['scripts/' + script], {
    env: {...process.env, ...settings},
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
