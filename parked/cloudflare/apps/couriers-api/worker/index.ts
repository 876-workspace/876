import { Container, getContainer } from '@cloudflare/containers'

/** Cloudflare Containers front door for the 876 Couriers API. */
export class CouriersApiContainer extends Container<Env> {
  defaultPort = 4001
  sleepAfter = '15m'

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Without this the container starts with an empty environment — no
    // DATABASE_URL, API key, or session-cookie secret — so every data route
    // fails while /health still answers.
    this.envVars = toContainerEnv(env)
  }
}

/**
 * Copies the Worker's string-valued vars and secrets into the container
 * environment. Bindings are objects rather than strings and are skipped.
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
    // Single logical instance for a shared stateless API process.
    // Scale via max_instances on the container config as load grows.
    const instance =
      (env as Record<string, string>).COURIERS_API_PRIMARY_INSTANCE ?? 'primary'
    const container = getContainer(env.COURIERS_API_CONTAINER, instance)
    return container.fetch(request)
  },
}

interface Env {
  COURIERS_API_CONTAINER: DurableObjectNamespace<CouriersApiContainer>
  COURIERS_API_PRIMARY_INSTANCE?: string
}
