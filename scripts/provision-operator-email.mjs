import {randomBytes,randomUUID,scrypt as derive} from 'node:crypto';
import {promisify} from 'node:util';
import {text} from 'node:stream/consumers';
import pg from 'pg';
import {hasValidNewPassword,PASSWORD_REQUIREMENTS} from '../lib/password-policy.ts';

const [emailArgument,displayName]=process.argv.slice(2);
const email=emailArgument?.trim().toLowerCase();
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!displayName?.trim()||process.stdin.isTTY){
 throw new Error('Usage: supply the password via piped stdin and run node scripts/provision-operator-email.mjs email display-name');
}
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const password=(await text(process.stdin)).replace(/\r?\n$/,'');
if(password.length<12||!hasValidNewPassword(password))throw new Error(PASSWORD_REQUIREMENTS.replace('8','12'));
const salt=randomBytes(16).toString('hex');
const hash='scrypt$'+salt+'$'+(await promisify(derive)(password,salt,64)).toString('hex');

const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10_000});
try{
 await client.connect();
 await client.query('begin');
 const result=await client.query(`insert into platform_operator_assignments(user_id,email,display_name,role,status,auth_source,password_hash)
    values ($1,$2,$3,'platform_admin','active','email_code',$4)
    on conflict (lower(email)) do update
      set display_name=excluded.display_name,auth_source='email_code',password_hash=excluded.password_hash,
          email_login_hash=null,email_login_challenge_hash=null,email_login_expires_at=null,email_login_attempts=0,updated_at=now()
    where platform_operator_assignments.role='platform_admin' and platform_operator_assignments.status='active'
    returning user_id`,[randomUUID(),email,displayName.trim(),hash]);
 const id=result.rows[0]?.user_id;
 if(!id)throw new Error('Existing account is suspended or has a different platform role.');
 await client.query('delete from platform_auth_sessions where user_id=$1',[id]);
 await client.query(`insert into platform_audit_events(actor_user_id,actor_email,action,entity_type,entity_id)
    values ('system','system@binso.ch','operator.email_credential_provisioned','platform_operator',$1)`,[id]);
 await client.query('commit');
 console.log('Email-code credential provisioned for '+email);
}catch(error){
 await client.query('rollback').catch(()=>{});
 throw error;
}finally{await client.end();}
