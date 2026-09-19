import 'server-only'

export async function crmApi(path: string, init?: RequestInit) {
  const baseUrl = process.env.CRM_API_URL
  const internalKey = process.env.CRM_INTERNAL_KEY
  if (!baseUrl || !internalKey) throw new Error('CRM API is not configured.')

  return fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-internal-key': internalKey,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}
