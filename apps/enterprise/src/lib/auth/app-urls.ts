/**
 * Cross-app URL helpers for the enterprise (org workspace) app.
 */

const CONSUMER_ORIGIN_DEFAULT = 'http://localhost:3000'
const CONSOLE_ORIGIN_DEFAULT = 'http://localhost:3002'

function readOrigin(
  value: string | undefined,
  fallback: string,
  previewPort: number
): string {
  const configured = normalizeValue(value)
  if (configured && !isLocalOrigin(configured)) return configured
  return getDevPreviewOrigin(previewPort) ?? configured ?? fallback
}

export function consumerOrigin(): string {
  return readOrigin(
    process.env.NEXT_PUBLIC_APP_URL,
    CONSUMER_ORIGIN_DEFAULT,
    3000
  )
}

export function consoleOrigin(): string {
  return readOrigin(
    process.env.NEXT_PUBLIC_CONSOLE_URL,
    CONSOLE_ORIGIN_DEFAULT,
    3002
  )
}

function buildUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${origin}${path}`
}

/** Absolute URL for a path in the consumer app. */
export function consumerUrl(path: string): string {
  return buildUrl(consumerOrigin(), path)
}

/** Absolute URL for a path in Console. */
export function consoleUrl(path: string): string {
  return buildUrl(consoleOrigin(), path)
}

function normalizeValue(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.replace(/\/+$/, '') : null
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Origin for a forwarded port inside a remote dev workspace.
 *
 * `DEV_PREVIEW_HOST_TEMPLATE` is the provider-agnostic contract written by
 * `scripts/setup-dev-env.mjs`; the Codespaces env vars remain as a fallback for
 * containers started before the setup script has run.
 */
function getDevPreviewOrigin(port: number): string | null {
  const template = normalizeValue(process.env.DEV_PREVIEW_HOST_TEMPLATE)
  if (template) return `https://${template.replaceAll('{port}', String(port))}`

  const codespaceName = normalizeValue(process.env.CODESPACE_NAME)
  const forwardingDomain = normalizeValue(
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  )
  if (!codespaceName || !forwardingDomain) return null
  return `https://${codespaceName}-${port}.${forwardingDomain}`
}
