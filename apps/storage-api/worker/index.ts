import { Container, getContainer } from '@cloudflare/containers'

/** Cloudflare Containers front door for the 876 Storage data plane. */
export class StorageApiContainer extends Container {
  defaultPort = 4005
  sleepAfter = '15m'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.STORAGE_API_CONTAINER, 'primary')
    return container.fetch(request)
  },
}

interface Env {
  STORAGE_API_CONTAINER: DurableObjectNamespace<StorageApiContainer>
}
