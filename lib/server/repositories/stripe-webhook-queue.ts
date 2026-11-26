import 'server-only';
import type {PoolClient} from 'pg';
import {objectValue,stripeId,type StripeObject} from '../stripe';
import {billingEventTypes,processStripeEvent,validateBillingEvent} from './stripe-billing';

/** Persist only IDs the processor needs. The provider remains the source of truth. */
export async function enqueueStripeEvent(client:PoolClient,event:StripeObject){
 const {type,eventId}=validateBillingEvent(event);
 if(!billingEventTypes.has(type))return {received:true,ignored:true};
 const source=objectValue(objectValue(event.data).object);
 const parent=objectValue(objectValue(source.parent).subscription_details);
 const payload={id:eventId,type,livemode:event.livemode,data:{object:{
  id:stripeId(source),customer:stripeId(source.customer),subscription:stripeId(source.subscription)||stripeId(parent.subscription),
 }}};
 const result=await client.query(
  "insert into billing_webhook_events(provider,external_event_id,event_type,status,payload,next_retry_at) values('stripe',$1,$2,'received',$3::jsonb,now()) on conflict(provider,external_event_id) do nothing returning id",
  [eventId,type,JSON.stringify(payload)],
 );
 return result.rowCount?{received:true,queued:true}:{received:true,duplicate:true};
}

const maxAttempts=10;

/** Caller supplies a transaction. Holding the row lock makes a crash retryable. */
export async function runNextStripeEvent(client:PoolClient){
 const {rows:[row]}=await client.query<{id:string;payload:StripeObject;attempts:number}>(
  "select id,payload,attempts from billing_webhook_events where provider='stripe' and status in ('received','failed') and dead_lettered_at is null and next_retry_at<=now() order by next_retry_at,id limit 1 for update skip locked",
 );
 if(!row)return 'empty';
 const attempts=row.attempts+1;
 await client.query('savepoint stripe_event');
 try{
  const result=await processStripeEvent(client,row.payload,true);
  await client.query("update billing_webhook_events set status=$2, attempts=$3, payload='{}'::jsonb, processed_at=now(), next_retry_at=null, error=null where id=$1",
   [row.id,result.processed?'processed':'ignored',attempts]);
  await client.query('release savepoint stripe_event');
  return 'processed';
 }catch(error){
  await client.query('rollback to savepoint stripe_event');
  const errorCode=error instanceof Error&&'code' in error&&typeof error.code==='string'&&/^[a-z0-9_]{1,64}$/i.test(error.code)?error.code:'processing_failed';
  const dead=attempts>=maxAttempts;
  const delay=Math.min(3600,15*2**(attempts-1));
  await client.query("update billing_webhook_events set status='failed',attempts=$2,error=$3,next_retry_at=case when $4 then null else now()+$5*interval '1 second' end,dead_lettered_at=case when $4 then now() else null end where id=$1",
   [row.id,attempts,errorCode,dead,delay]);
  await client.query('release savepoint stripe_event');
  return dead?'dead_lettered':'retry';
 }
}
