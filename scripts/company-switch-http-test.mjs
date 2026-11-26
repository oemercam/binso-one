import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export async function verifyCompanySwitch({base,pool,cookies,organizations}){
 const [first,second]=organizations,user='http-0-owner';
 const email='http-0-owner@fixture.invalid',password='Synthetic-company-switch-password-123!';
 const source=(await import('./data-test-modules.mjs')).moduleUrl;
 const fs=await import('node:fs/promises');
 const policy=source(await fs.readFile('lib/password-policy.ts','utf8'));
 const {hashPassword}=await import(source((await fs.readFile('lib/server/password.ts','utf8'))
   .replace('import "server-only";','').replace('"@/lib/password-policy"',JSON.stringify(policy))));
 await pool.query('update app_users set password_hash=$2,email_verified_at=now() where id=$1',[user,await hashPassword(password)]);
 const request=(path,{method='GET',cookie,context,body,extra={}}={})=>fetch(base+path,{
  method,headers:{origin:base,...(cookie?{cookie}:{}),...(context?{'X-Binso-Company-Context':context}:{}),
   ...(body?{'content-type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)
 });
 const login=async()=>{
  const result=await request('/api/auth/login',{method:'POST',body:{email,password,rememberMe:false}});
  assert.equal(result.status,200,await result.clone().text());
  const cookie=result.headers.getSetCookie().find(value=>value.startsWith('binso_v213_test_session='));
  assert.ok(cookie);return cookie.split(';')[0];
 };
 const initial=await login();
 const invitation=await request('/api/settings/team/invitations',{method:'POST',cookie:cookies.get('1:owner'),
  body:{email,role:'reader'},extra:{'Idempotency-Key':randomUUID()}});
 assert.ok([201,503].includes(invitation.status),await invitation.clone().text());
 const pending=(await pool.query(`select i.id,i.invited_user_id,o.body,m.status from organization_invitations i
  join mail_outbox o on o.entity_id=i.id::text and o.organization_id=i.organization_id
  join organization_memberships m on m.user_id=i.invited_user_id and m.organization_id=i.organization_id
  where i.organization_id=$1 and i.email=$2`,[second,email])).rows[0];
 assert.equal(pending.invited_user_id,user);assert.equal(pending.status,'invited');
 const token=new URL(pending.body.match(/http[^\s]+/)[0]).searchParams.get('token');
 assert.ok(token);
 const accept=(value)=>request('/api/auth/invitation',{method:'POST',body:{token,password:value}});
 assert.equal((await accept('wrong-synthetic-password')).status,403);
 const accepted=await accept(password);assert.equal(accepted.status,200,await accepted.clone().text());
 assert.equal((await accept(password)).status,400);
 const readSession=async cookie=>(await request('/api/auth/session',{cookie})).json();
 const list=async(cookie,context)=>(await request('/api/auth/companies',{cookie,context})).json();
 assert.equal((await readSession(initial)).tenant.id,first);
 const choices=await list(initial);
 assert.deepEqual(choices.items.map(({id,role})=>[id,role]),[[first,'owner'],[second,'reader']]);
 const foreign=randomUUID();
 await pool.query("insert into organizations(id,name,slug,status) values($1,'Unrelated synthetic company',$2,'active')",[foreign,'unrelated-'+foreign]);
 await assert.rejects(pool.query("insert into organization_memberships(organization_id,user_id,email,role,status) values($1,$2,$3,'member','active')",[second,'http-0-admin','http-0-admin@fixture.invalid']),e=>e.constraint==='single_active_company_identity');
 assert.equal((await request('/api/auth/companies',{method:'POST',cookie:initial,body:{organizationId:foreign}})).status,404);
 const sameSwitch=()=>request('/api/auth/companies',{method:'POST',cookie:initial,body:{organizationId:second}});
 const outcomes=await Promise.all([sameSwitch(),sameSwitch()]);
 assert.deepEqual(outcomes.map(item=>item.status).sort(),[200,401]);
 const cookie=outcomes.find(item=>item.ok).headers.getSetCookie().find(item=>item.startsWith('binso_v213_test_session=')).split(';')[0];
 assert.equal((await readSession(initial)).authenticated,false,'Switch revokes the old token');
 const current=await readSession(cookie);
 assert.equal(current.tenant.id,second);assert.equal(current.tenant.role,'reader');
 assert.match(current.companyContext,/^[a-f0-9]{64}$/);
 assert.equal((await request('/api/customers',{cookie})).status,409,'A pre-switch tab has no context for the new cookie');
 assert.equal((await request('/api/customers',{method:'POST',cookie,context:'0'.repeat(64),body:{name:'Must not be written'}})).status,409);
 const scoped=await request('/api/customers',{cookie,context:current.companyContext});
 assert.equal(scoped.status,200,await scoped.clone().text());
 const knownForeign=(await pool.query('select id from customers where organization_id=$1 limit 1',[first])).rows[0].id;
 assert.equal((await request('/api/customers/'+knownForeign,{cookie,context:current.companyContext})).status,404);
 assert.equal((await request('/api/customers',{method:'POST',cookie,context:current.companyContext,body:{name:'Must not be written'}})).status,403,'Target reader cannot create customers');
 const browserModule=process.env.BINSO_COMPANY_PLAYWRIGHT;
 if(browserModule){
  const {chromium}=await import(pathToFileURL(browserModule).href);
  const browser=await chromium.launch({executablePath:process.env.BINSO_COMPANY_CHROMIUM||undefined,headless:true});
  try{
   const browserContext=await browser.newContext();
   await browserContext.addInitScript(()=>{
    Object.defineProperty(window,'BroadcastChannel',{value:undefined});
    window.addEventListener('storage',event=>event.stopImmediatePropagation(),true);
   });
   const browserCookie=await login();
   await browserContext.addCookies([{name:'binso_v213_test_session',value:browserCookie.slice(browserCookie.indexOf('=')+1),url:base,httpOnly:true}]);
   const page=await browserContext.newPage(),oldTab=await browserContext.newPage();
   await Promise.all([page.goto(base+'/dashboard'),oldTab.goto(base+'/dashboard')]);
   await Promise.all([page.getByRole('button',{name:'Benutzerkonto'}).first().waitFor(),oldTab.getByRole('button',{name:'Benutzerkonto'}).first().waitFor()]);
   const before=(await readSession(browserCookie)).companyContext;
   const target=(await list(browserCookie,before)).items.find(item=>item.id===second);
   await page.getByRole('button',{name:'Benutzerkonto'}).first().click();
   await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.getByRole('button',{name:target.name,exact:true}).click()
   ]);
   const stale=await oldTab.evaluate(async context=>{
    const res=await fetch('/api/customers',{method:'POST',headers:{'Content-Type':'application/json','X-Binso-Company-Context':context},body:JSON.stringify({name:'Stale tab synthetic customer'})});
    return {status:res.status,error:(await res.json()).error};
   },before);
   assert.deepEqual(stale,{status:409,error:'company_context_changed'});
   const now=await page.evaluate(async()=>fetch('/api/auth/session').then(r=>r.json()));
   assert.equal(now.tenant.id,second);assert.equal(now.tenant.role,'reader');
   await page.setViewportSize({width:390,height:844});
   await page.getByRole('button',{name:'Benutzerkonto'}).first().click();
   await Promise.all([
    page.waitForEvent('domcontentloaded'),
    page.getByRole('button',{name:choices.items[0].name,exact:true}).click()
   ]);
   assert.equal((await page.evaluate(async()=>fetch('/api/auth/session').then(r=>r.json()))).tenant.id,first);
   console.log('Chromium: account menu switch in one tab and stale second-tab mutation denial passed.');
  }finally{await browser.close();}
 }
 const acceptedId=(await pool.query('select accepted_invitation_id from organization_memberships where user_id=$1 and organization_id=$2',[user,second])).rows[0].accepted_invitation_id;
 assert.equal(acceptedId,pending.id);
 await pool.query("update organization_memberships set status='suspended' where user_id=$1 and organization_id=$2",[user,second]);
 assert.equal((await readSession(cookie)).authenticated,false,'Suspended target membership invalidates the new session');
 const active=await login(),activeContext=(await readSession(active)).companyContext;
 assert.deepEqual((await list(active,activeContext)).items.map(item=>item.id),[first]);
 assert.equal((await request('/api/auth/companies',{method:'POST',cookie:active,context:activeContext,body:{organizationId:second}})).status,404);
 assert.ok((await pool.query("select count(*)::int n from audit_events where action='auth.company_switched' and organization_id=$1 and actor_user_id=$2",[second,user])).rows[0].n);
 assert.equal((await pool.query("select count(*)::int n from customers where name in ('Must not be written','Stale tab synthetic customer')")).rows[0].n,0);
 console.log('Native company switch: verified invitation, independent roles and data, token rotation, one concurrent winner, stale-tab header, unauthorized target and immediate revocation passed.');
}
