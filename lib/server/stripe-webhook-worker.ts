import 'server-only';
import {withPlatform} from './db';
import {log} from './logger';
import {runNextStripeEvent} from './repositories/stripe-webhook-queue';
import {stripeConfigured} from './stripe';

declare global {var __binsoStripeWebhookWorker:boolean|undefined;}

/** Isolated billing loop, with database locks coordinating application replicas. */
export function startStripeWebhookWorker(){
 if(globalThis.__binsoStripeWebhookWorker||!stripeConfigured())return;
 globalThis.__binsoStripeWebhookWorker=true;
 let verified=false;
 const tick=async()=>{
  let next=15000;
  try{
   for(let count=0;count<5;count++){
    const state=await withPlatform(runNextStripeEvent);
    if(!verified){
     log('info','stripe_webhook_worker_ready',{});
     verified=true;
    }
    if(state==='empty')break;
    if(state==='dead_lettered')log('error','stripe_webhook_dead_letter',{});
    if(state==='retry')log('warn','stripe_webhook_retry',{});
    if(count===4)next=1000;
   }
  }catch{
   log('error','stripe_webhook_worker_failed',{});
   next=60000;
  }finally{
   setTimeout(()=>void tick(),next).unref();
  }
 };
 setTimeout(()=>void tick(),5000).unref();
}
