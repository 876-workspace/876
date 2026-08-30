export type WorkRuntime = {
  baseUrl: string
  internalKey: string
  fetch?: typeof globalThis.fetch
  requestId?: string
}

export type WorkOperatorClientOptions = {
  baseUrl?: string
  internalKey?: string
  fetch?: typeof globalThis.fetch
  requestId?: string
}

export function createWorkRuntime(
  options: WorkOperatorClientOptions
): WorkRuntime {
  return {
    baseUrl: (options.baseUrl ?? '').replace(/\/$/, ''),
    internalKey: options.internalKey ?? '',
    fetch: options.fetch,
    requestId: options.requestId,
  }
}
