import { Container, getContainer } from '@cloudflare/containers'

/**
 * Cloudflare Containers front door for the Billing Express data plane.
 * Keep BILLING_WRITER=none until the finance cutover runbook flips ownership.
 * See docs/cloudflare.md and docs/billing-api-cutover.md.
 */
export class BillingApiContainer extends Container<Env> {
  defaultPort = 4004
  sleepAfter = '15m'

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Without this the container starts with an empty environment — no
    // BILLING_DATABASE_URL, no keys — so every data route fails while /health
    // still answers.
    this.envVars = toContainerEnv(env)
  }
}

/**
 * Copies the Worker's string-valued vars and secrets into the container
 * environment. Bindings are objects, not strings, and are skipped.
 */
function toContainerEnv(env: Env): Record<string, string> {
  const forwarded: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') forwarded[key] = value
  }

  return forwarded
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(
      env.BILLING_API_CONTAINER,
      env.BILLING_API_PRIMARY_INSTANCE ?? 'primary'
    )
    return container.fetch(request)
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    if (env.BILLING_SWEEP_ENABLED !== 'true') return

    ctx.waitUntil(
      (async () => {
        if (!env.BILLING_SCHEDULER_KEY) {
          throw new Error(
            'BILLING_SCHEDULER_KEY is required when sweeps are enabled.'
          )
        }
        const container = getContainer(env.BILLING_API_CONTAINER, 'scheduler')
        const response = await container.fetch(
          new Request('http://container/internal/billing-sweep', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-scheduler-key': env.BILLING_SCHEDULER_KEY,
            },
            body: '{}',
          })
        )
        if (!response.ok)
          throw new Error(`Billing sweep failed with ${response.status}.`)
      })()
    )
  },
}

interface Env {
  BILLING_API_CONTAINER: DurableObjectNamespace<BillingApiContainer>
  BILLING_API_PRIMARY_INSTANCE?: string
  ENVIRONMENT?: string
  BILLING_SCHEDULER_KEY?: string
  BILLING_SWEEP_ENABLED?: string
}
