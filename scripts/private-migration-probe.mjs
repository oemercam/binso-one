import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: true},
  connectionTimeoutMillis: 10_000,
});
await client.connect();
try {
  await client.query('begin read only');
  const {rows: [scope]} = await client.query('select current_database() as database, current_user as role, session_user as login');
  if (scope.database !== 'binso_platform' || scope.role !== 'binso_one_migrations' || scope.login !== 'binso_one_migrations_live') {
    throw new Error('Unexpected database or migration identity');
  }
  await client.query('select 1 from schema_migrations limit 1');
  await client.query('rollback');
} finally {
  await client.end();
}
