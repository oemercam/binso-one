import {createHash,randomBytes} from 'node:crypto';
import pg from 'pg';

const [email,...extra]=process.argv.slice(2);
if(!email||extra.length||!process.env.DATABASE_URL)throw Error('Provide the existing operator email and DATABASE_URL.');
const origin=new URL(process.env.APP_URL??'https://one.binso.ch');
if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('APP_URL must be an HTTPS origin.');
const setup=new URL('/operator/login?einrichten=1',origin);
const token=randomBytes(32).toString('base64url');
setup.hash=token;
const hash=createHash('sha256').update(token).digest('hex');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}});
await client.connect();
try{
 await client.query('begin');
 const assigned=await client.query(`
  update platform_operator_assignments set email_setup_hash=$2,email_setup_expires_at=now()+interval '30 minutes'
   where lower(email)=lower($1) and status='active' and auth_source='entra' returning user_id
 `,[email,hash]);
 if(assigned.rowCount!==1)throw Error('Exactly one active operator assignment is required.');
 await client.query(`insert into platform_audit_events(actor_user_id,actor_email,action,entity_type,entity_id)
  values('system','system@binso.ch','operator.email_setup_prepared','platform_operator',$1)`,[assigned.rows[0].user_id]);
 await client.query('commit');
 process.stdout.write(setup.href+'\n');
}catch(error){await client.query('rollback');throw error;}
finally{await client.end();}
