export type WidgetsClientResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code?: string; message: string } }

export type CreateWidgetsClientOptions = {
  baseUrl?: string
  serviceKey?: string
  fetch?: typeof fetch
}

export type Actor = {
  userId: string
}

export function resolveConfig(options: CreateWidgetsClientOptions) {
  const baseUrl = (
    options.baseUrl ??
    process.env.WIDGETS_API_URL ??
    ''
  ).replace(/\/$/, '')
  const serviceKey = options.serviceKey ?? process.env.WIDGETS_SERVICE_KEY ?? ''

  return {
    baseUrl,
    serviceKey,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  }
}

export async function requestJson<T>(
  config: ReturnType<typeof resolveConfig>,
  actor: Actor,
  init: {
    method: string
    path: string
    body?: unknown
    query?: Record<string, string | number | undefined>
    role?: 'admin'
  },
  parse: (data: unknown) => T | null
): Promise<WidgetsClientResult<T>> {
  if (!config.baseUrl || !config.serviceKey)
    return {
      data: null,
      error: {
        code: 'widgets/not-configured',
        message: 'Widgets API is not configured.',
      },
    }

  const url = new URL(init.path, `${config.baseUrl}/`)
  if (init.query) {
    for (const [key, value] of Object.entries(init.query)) {
      if (value !== undefined && value !== '')
        url.searchParams.set(key, String(value))
    }
  }

  try {
    const response = await config.fetch(url, {
      method: init.method,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-internal-key': config.serviceKey,
        'x-876-actor-user-id': actor.userId,
        ...(init.role === 'admin' ? { 'x-876-widget-role': 'admin' } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => null)) as {
      data?: unknown
      error?: { code?: string; message?: string } | string | null
    } | null

    if (!payload || typeof payload !== 'object')
      return {
        data: null,
        error: {
          code: 'widgets/invalid-response',
          message: 'The Widgets API returned an invalid response.',
        },
      }

    if (payload.error) {
      const message =
        typeof payload.error === 'string'
          ? payload.error
          : (payload.error.message ?? 'Widgets API request failed.')

      return {
        data: null,
        error: {
          code:
            typeof payload.error === 'object' ? payload.error.code : undefined,
          message,
        },
      }
    }

    const data = parse(payload.data)
    if (!data)
      return {
        data: null,
        error: {
          code: 'widgets/invalid-response',
          message: 'The Widgets API returned an unexpected payload.',
        },
      }

    return { data, error: null }
  } catch (error) {
    console.error('[widgets] request failed', {
      host: url.host,
      path: init.path,
      cause: error instanceof Error ? error.message : String(error),
    })

    return {
      data: null,
      error: {
        code: 'widgets/network-error',
        message: 'Unable to reach the Widgets API.',
      },
    }
  }
}
