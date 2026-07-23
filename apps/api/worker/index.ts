import { Container, getContainer } from '@cloudflare/containers'

/**
 * Cloudflare Containers front door for the FastAPI identity API.
 *
 * The container image is built from apps/api/Dockerfile (uvicorn on PORT).
 * Secrets and plain env vars are set on the Worker via wrangler secret / vars
 * and forwarded into the container process.
 *
 * See docs/cloudflare.md.
 */
export class ApiContainer extends Container {
  defaultPort = 4000
  // Keep warm longer than default; identity is hit on every app request.
  sleepAfter = '15m'
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
