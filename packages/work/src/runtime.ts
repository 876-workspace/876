export type WorkRuntime = {
  baseUrl: string
  credential: { header: 'x-internal-key' | 'x-876-api-key'; value: string }
  accessToken?: string
  requiresAccessToken?: boolean
  fetch: typeof globalThis.fetch
  requestId?: string
}

export type WorkOperatorClientOptions = {
  baseUrl?: string
  internalKey?: string
  fetch?: typeof globalThis.fetch
  requestId?: string
}

export type WorkIntegrationClientOptions = {
  baseUrl?: string
  apiKey?: string
  fetch?: typeof globalThis.fetch
  requestId?: string
}

export type WorkSessionClientOptions = WorkIntegrationClientOptions & {
  accessToken?: string
}

export function createWorkRuntime(options: WorkOperatorClientOptions): WorkRuntime {
  return {
    baseUrl: (options.baseUrl ?? '').replace(/\/$/, ''),
    credential: { header: 'x-internal-key', value: options.internalKey ?? '' },
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export function createWorkIntegrationRuntime(options: WorkIntegrationClientOptions): WorkRuntime {
  return {
    baseUrl: (options.baseUrl ?? '').replace(/\/$/, ''),
    credential: { header: 'x-876-api-key', value: options.apiKey ?? '' },
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export function createWorkSessionRuntime(options: WorkSessionClientOptions): WorkRuntime {
  return {
    ...createWorkIntegrationRuntime(options),
    accessToken: options.accessToken,
    requiresAccessToken: true,
  }
}
