import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {verifyAppliedMigrationState} from './scripts/schema-contract.mjs';

if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
const client=new pg.Client({
  connectionString:process.env.DATABASE_URL,
  ssl:{rejectUnauthorized:true},
  connectionTimeoutMillis:10_000,
});
await client.connect();
let alreadyApplied;
try{
  await client.query('begin isolation level repeatable read read only');
  const {rows:[scope]}=await client.query('select current_database() as database, current_user as role, session_user as login');
  if(scope.database!=='binso_platform'||scope.role!=='binso_one_migrations'||scope.login!=='binso_one_migrations_live')throw Error('Unexpected database or migration identity');
  const contract=JSON.parse(await readFile('database/schema-contract.json','utf8'));
  alreadyApplied=await verifyAppliedMigrationState(client,contract);
  await client.query('rollback');
}finally{
  await client.end();
}
if(alreadyApplied){
  console.log('Migration checksums and deployed database schema match the release.');
  process.exit(0);
}

const steps = [
  ['wait-postgres.mjs'],
  ['single-company-preflight.mjs', ['--private-slot']],
  ['migrate.mjs'],
  ['check-db.mjs'],
];

for (const [script, args = []] of steps) {
  const result = spawnSync(process.execPath, ['scripts/' + script, ...args], {
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
