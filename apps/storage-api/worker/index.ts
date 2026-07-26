import { Container, getContainer } from '@cloudflare/containers'

/** Cloudflare Containers front door for the 876 Storage data plane. */
export class StorageApiContainer extends Container<Env> {
  defaultPort = 4005
  sleepAfter = '15m'

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Without this the container starts with an empty environment — no
    // STORAGE_DATABASE_URL, no R2 credentials — so every data route fails
    // while /health still answers.
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
    const url = new URL(request.url)
    if (url.pathname === '/_cron/storage-sweep') {
      const container = getContainer(env.STORAGE_API_CONTAINER, 'scheduler')
      return container.fetch(
        new Request(new URL('/internal/storage-sweep', request.url), {
          method: 'POST',
          headers: request.headers,
        })
      )
    }

    const container = getContainer(env.STORAGE_API_CONTAINER, 'primary')
    return container.fetch(request)
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const container = getContainer(env.STORAGE_API_CONTAINER, 'scheduler')
        const response = await container.fetch(
          new Request('http://container/internal/storage-sweep', {
            method: 'POST',
            headers: {
              'x-scheduler-key': env.STORAGE_SCHEDULER_KEY,
            },
          })
        )
        if (!response.ok)
          throw new Error(`Storage sweep failed with HTTP ${response.status}`)
      })()
    )
  },
}

interface Env {
  STORAGE_API_CONTAINER: DurableObjectNamespace<StorageApiContainer>
  STORAGE_SCHEDULER_KEY: string
}
