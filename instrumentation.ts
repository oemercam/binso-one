/** Next invokes register once per server instance. Start workers only in the runtime. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return;

    const {startStripeWebhookWorker} = await import('./lib/server/stripe-webhook-worker');
    startStripeWebhookWorker();
    if (process.env.WEB_PUSH_WORKER_ENABLED === 'true') {
      const {startPushWorker} = await import('./lib/server/push-worker');
      startPushWorker();
    }
  }
}
