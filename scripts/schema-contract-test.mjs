import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {captureSchema,checkSchema,checkMigrationVersions,migrationFiles,verifyAppliedMigrationState} from './schema-contract.mjs';
const db=new PGlite();
try{
 await db.exec('create table scoped(id uuid not null,organization_id uuid not null); alter table scoped enable row level security; alter table scoped force row level security; create policy tenant on scoped using (organization_id=current_setting(\'app.organization_id\',true)::uuid)');
 const contract={tables:await captureSchema(db)};await checkSchema(db,contract);
 for(const mutation of ['alter table scoped disable row level security','alter table scoped no force row level security','drop policy tenant on scoped','alter policy tenant on scoped using (true)','alter policy tenant on scoped with check (true)','alter table scoped drop column id','create table unclassified(id int)']){
  await db.exec('begin');await db.exec(mutation);await assert.rejects(checkSchema(db,contract));await db.exec('rollback');
 }
 const versions=(await migrationFiles()).map(version=>({version}));await checkMigrationVersions(versions);
 await assert.rejects(checkMigrationVersions(versions.slice(0,-1)),/Required migration/);
 await assert.rejects(checkMigrationVersions(versions,{checksums:true}),/checksum mismatch/);
 await db.exec('create table schema_migrations(version text primary key, checksum text not null)');
 const exact=[];
 for(const {version} of versions){
  const checksum=createHash('sha256').update(await fs.readFile('database/migrations/'+version)).digest('hex');
  exact.push([version,checksum]);
  await db.query('insert into schema_migrations values($1,$2)',[version,checksum]);
 }
 await db.exec('create role migration_reader; grant select on schema_migrations to migration_reader; set role migration_reader');
 await db.exec('begin read only');
 assert.equal(await verifyAppliedMigrationState(db,contract),true,'Fully applied releases need only ledger and catalog reads');
 await db.exec('rollback; reset role');
 await db.query('delete from schema_migrations where version=$1',[exact.at(-1)[0]]);
 assert.equal(await verifyAppliedMigrationState(db,contract),false,'The existing migration path handles pending files');
 await db.query("update schema_migrations set checksum='changed' where version=$1",[exact[0][0]]);
 await assert.rejects(verifyAppliedMigrationState(db,contract),/Migration checksum mismatch/);
 await db.query('update schema_migrations set checksum=$2 where version=$1',exact[0]);
 await db.query('insert into schema_migrations values($1,$2)',exact.at(-1));
 await db.exec('alter table scoped disable row level security');
 await assert.rejects(verifyAppliedMigrationState(db,contract),/RLS contract mismatch/);
 console.log('Schema gate rejects missing latest migration, changed checksum, missing columns/policies, disabled RLS/FORCE and unclassified tables.');
}finally{await db.close();}
