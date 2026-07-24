import { Container, getContainer } from '@cloudflare/containers'

/**
 * Cloudflare Containers front door for the Billing FastAPI data plane.
 * Keep BILLING_WRITER=none until the finance cutover runbook flips ownership.
 * See docs/cloudflare.md and docs/billing-api-cutover.md.
 */
export class BillingApiContainer extends Container {
  defaultPort = 4004
  sleepAfter = '15m'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Cron Trigger hits /_cron/billing-sweep; forward to a one-shot path
    // the container can expose later (or run via scripts.run_billing over HTTP).
    if (url.pathname === '/_cron/billing-sweep') {
      const auth =
        request.headers.get('cf-cron') ?? request.headers.get('authorization')
      if (!auth && env.ENVIRONMENT === 'production') {
        // Cloudflare Cron Triggers do not send browser auth; rely on Worker-only route.
      }
      const container = getContainer(env.BILLING_API_CONTAINER, 'scheduler')
      return container.fetch(
        new Request(new URL('/internal/billing-sweep', request.url), {
          method: 'POST',
          headers: request.headers,
        })
      )
    }

    const container = getContainer(env.BILLING_API_CONTAINER, 'primary')
    return container.fetch(request)
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    // Cron: */5 * * * * (configured in wrangler.jsonc triggers.crons)
    ctx.waitUntil(
      (async () => {
        const container = getContainer(env.BILLING_API_CONTAINER, 'scheduler')
        await container.fetch(
          new Request('http://container/internal/billing-sweep', {
            method: 'POST',
          })
        )
      })()
    )
  },
}

interface Env {
  BILLING_API_CONTAINER: DurableObjectNamespace<BillingApiContainer>
  ENVIRONMENT?: string
}
