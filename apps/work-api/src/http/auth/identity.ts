export type IdentityApp = { id: string }

export type IdentityGateway = {
  appForApiKey(apiKey: string): Promise<IdentityApp | null>
}

export class IdentityUnavailableError extends Error {
  constructor() {
    super('The identity service could not verify the request.')
    this.name = 'IdentityUnavailableError'
  }
}

export class HttpIdentityGateway implements IdentityGateway {
  async appForApiKey(apiKey: string): Promise<IdentityApp | null> {
    const apiUrl = (process.env.API_URL ?? 'http://127.0.0.1:4000').replace(
      /\/+$/,
      ''
    )

    let response: Response
    try {
      response = await fetch(`${apiUrl}/apps/current`, {
        headers: { 'x-876-api-key': apiKey },
        signal: AbortSignal.timeout(5_000),
      })
    } catch {
      throw new IdentityUnavailableError()
    }

    if (response.status === 401 || response.status === 403) return null
    if (!response.ok) throw new IdentityUnavailableError()

    let raw: unknown
    try {
      raw = await response.json()
    } catch {
      throw new IdentityUnavailableError()
    }

    const payload = unwrapEnvelope(raw)
    if (!isApp(payload)) throw new IdentityUnavailableError()
    return { id: payload.id }
  }
}

function unwrapEnvelope(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw
  const record = raw as Record<string, unknown>
  if ('data' in record && 'error' in record)
    return record.error === null ? record.data : null
  return raw
}

function isApp(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).id === 'string' &&
    Boolean((value as Record<string, unknown>).id)
  )
}
