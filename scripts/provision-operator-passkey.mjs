import {createHash,randomBytes,scrypt as derive} from 'node:crypto';
import {promisify} from 'node:util';
import pg from 'pg';

const [email,...extra]=process.argv.slice(2);
if(!email||extra.length||process.stdin.isTTY||!process.env.DATABASE_URL){
 throw Error('Provide an existing operator email, DATABASE_URL and a password on stdin.');
}
const chunks=[];
for await(const chunk of process.stdin)chunks.push(chunk);
const password=Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/,'');
if(password.length<16||password.length>256)throw Error('Admin passwords must contain at least 16 characters.');
const salt=randomBytes(16).toString('hex');
const passwordHash='scrypt$'+salt+'$'+(await promisify(derive)(password,salt,64)).toString('hex');
const setup=randomBytes(32).toString('base64url');
const setupHash=createHash('sha256').update(setup).digest('hex');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true}});
await client.connect();
try{
 await client.query('begin');
 const operator=(await client.query("select user_id,email from platform_operator_assignments where lower(email)=lower($1) and status='active' for update",[email])).rows[0];
 if(!operator)throw Error('Active operator assignment not found.');
 const credential=await client.query('select 1 from platform_operator_passkeys where user_id=$1 limit 1',[operator.user_id]);
 if(credential.rowCount)throw Error('This operator already has a passkey.');
 await client.query(`update platform_operator_assignments set auth_source='password_passkey',password_hash=$2,
   passkey_setup_hash=$3,passkey_setup_expires_at=now()+interval '30 minutes',updated_at=now() where user_id=$1`,[operator.user_id,passwordHash,setupHash]);
 await client.query('delete from platform_auth_sessions where user_id=$1',[operator.user_id]);
 await client.query('delete from platform_operator_passkey_challenges where user_id=$1',[operator.user_id]);
 await client.query(`insert into platform_audit_events(actor_user_id,actor_email,action,entity_type,entity_id)
   values('system','system@binso.ch','operator.passkey_setup_prepared','platform_operator',$1)`,[operator.user_id]);
 await client.query('commit');
 // Print the single-use setup code only to the administrator running this command.
 process.stdout.write(setup+'\n');
}catch(error){
 await client.query('rollback');
 throw error;
}finally{await client.end();}
