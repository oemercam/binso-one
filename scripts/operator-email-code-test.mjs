import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {moduleUrl} from './data-test-modules.mjs';

async function load(path,imports={}){
 let source=(await fs.readFile(path,'utf8')).replace(/import ['"]server-only['"];?/, '');
 for(const [specifier,url] of Object.entries(imports))source=source.replaceAll(JSON.stringify(specifier),JSON.stringify(url)).replaceAll("'"+specifier+"'",JSON.stringify(url));
 return moduleUrl(source);
}

const nextHeaders=moduleUrl(`
 const jar=new Map();
 export const headers=async()=>new Headers();
 export const cookies=async()=>({
  get:name=>jar.get(name),
  set:(name,value)=>jar.set(name,{value}),
  delete:name=>jar.delete(name)
 });
`);
const env=moduleUrl('export const env={appMode:"production",operatorEmailLoginEnabled:true,appEncryptionKey:"fixture",operatorSessionCookieName:"operator",sessionTtlHours:168};');
const database=await load('lib/server/db.ts',{'pg':import.meta.resolve('pg'),'@/lib/server/env':moduleUrl('export const env={}; export const requireDatabaseUrl=()=>{throw Error("External database forbidden")};')});
const http=await load('lib/server/http.ts',{'next/server':import.meta.resolve('next/server.js')});
const audit=await load('lib/server/operator/audit.ts',{'@/lib/server/db':database});
const session=await load('lib/server/operator/session.ts',{'next/headers':nextHeaders,'@/lib/server/db':database,'@/lib/server/env':env,'./login-mode':moduleUrl('export const operatorEmailLoginEnabled=()=>true,operatorPasskeyLoginEnabled=()=>false;'),'@/lib/server/operator/entra':moduleUrl('export const getEntraOperatorIdentity=async()=>null;')});
const mail=moduleUrl('export const sendMail=async message=>{globalThis.operatorMail=message; return {delivered:!globalThis.operatorMailFailure};};');
const policy=await load('lib/password-policy.ts');
const password=await load('lib/server/password.ts',{'@/lib/password-policy':policy});
const login=await import(await load('lib/server/operator/email-login.ts',{'next/headers':nextHeaders,'@/lib/server/db':database,'@/lib/server/env':env,'@/lib/server/http':http,'@/lib/server/password':password,'@/lib/server/email':mail,'./audit':audit,'./session':session}));
const {getOperatorSession}=await import(session);
const jar=await (await import(nextHeaders)).cookies();
const db=new PGlite({extensions:{pgcrypto}});

try{
 await db.exec('create extension pgcrypto; create role schema_owner; grant usage,create on schema public to schema_owner; set role schema_owner');
 for(const migration of (await fs.readdir('database/migrations')).filter(file=>file.endsWith('.sql')).sort()){
  await db.exec(await fs.readFile('database/migrations/'+migration,'utf8'));
 }
 const query=db.query.bind(db);
 globalThis.__binsoPool={query,connect:async()=>({query,release(){}})};
 const email='operator@example.invalid',secret='Local test password!7';
 const linkToken='B'.repeat(43);
 const setupHash=createHash('sha256').update(linkToken).digest('hex');
 await db.query("insert into platform_operator_assignments(user_id,email,role,auth_source,email_setup_hash,email_setup_expires_at) values('local-admin',$1,'platform_admin','entra',$2,now()+interval '30 minutes')",[email,setupHash]);
 assert.equal(await login.setInitialOperatorPassword('A'.repeat(43),secret),false);
 assert.equal(await login.setInitialOperatorPassword(linkToken,secret),true);
 assert.equal(await login.setInitialOperatorPassword(linkToken,secret),false);
 await assert.rejects(login.beginOperatorEmailLogin(email,'wrong'),{code:'invalid_credentials'});
 assert.equal(globalThis.operatorMail,undefined);
 globalThis.operatorMailFailure=true;
 await assert.rejects(login.beginOperatorEmailLogin(email,secret),{code:'mail_unavailable'});
 globalThis.operatorMailFailure=false;
 await login.beginOperatorEmailLogin(email,secret);
 await assert.rejects(login.beginOperatorEmailLogin(email,secret),{code:'operator_code_wait'});
 const code=/\d{6}/.exec(globalThis.operatorMail.text)[0];
 const challenge=jar.get('binso_operator_email_challenge').value;
 jar.set('binso_operator_email_challenge','A'.repeat(43));
 assert.equal(await login.finishOperatorEmailLogin(code),false);
 assert.equal((await db.query("select email_code_attempts from platform_operator_assignments where user_id='local-admin'")).rows[0].email_code_attempts,0);
 jar.set('binso_operator_email_challenge',challenge);
 assert.equal(await getOperatorSession(),null);
 assert.equal(await login.finishOperatorEmailLogin(code),true);
 assert.equal((await getOperatorSession()).role,'platform_admin');
 assert.equal((await getOperatorSession()).authSource,'password_email_code');
 jar.set('binso_operator_email_challenge',challenge);
 assert.equal(await login.finishOperatorEmailLogin(code),false);
 await db.query("update platform_operator_assignments set status='suspended' where user_id='local-admin'");
 assert.equal(await getOperatorSession(),null);
 await assert.rejects(login.beginOperatorEmailLogin(email,secret),{code:'invalid_credentials'});
 console.log('Operator email login: password, mail failure, cooldown, browser binding, single use, production session and account suspension passed.');
}finally{
 delete globalThis.__binsoPool;
 await db.close();
}
