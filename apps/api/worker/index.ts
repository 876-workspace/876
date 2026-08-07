import { Container, getContainer } from '@cloudflare/containers'

/**
 * Cloudflare Containers front door for the 876 identity API.
 *
 * The container image is built from apps/api/Dockerfile (Express on PORT).
 * Secrets and plain env vars are set on the Worker via wrangler secret / vars
 * and forwarded into the container process by `toContainerEnv` below.
 *
 * See docs/cloudflare.md.
 */
export class ApiContainer extends Container<Env> {
  defaultPort = 4000
  // Keep warm longer than default; identity is hit on every app request.
  sleepAfter = '15m'

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Without this the container starts with an empty environment: no
    // DATABASE_URL, no WorkOS credentials, no SENTRY_DSN. /health still answers
    // because it touches nothing, so the service looks healthy while every
    // database-backed route returns 500 and reports the failure nowhere.
    this.envVars = toContainerEnv(env)
  }
}

/**
 * Copies the Worker's string-valued vars and secrets into the container
 * environment.
 *
 * Bindings (Durable Object namespaces, R2 buckets, service bindings) are
 * objects rather than strings and are skipped: a container environment only
 * accepts string values, and a binding is not usable inside the container
 * process anyway.
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
    const container = getContainer(env.API_CONTAINER, 'primary')
    return container.fetch(request)
  },
}

interface Env {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>
}
