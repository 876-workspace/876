/**
 * Cross-app URL helpers.
 *
 * The 876 platform runs three Next.js apps (each hosts its own embedded auth):
 *   - Consumer app (this app) at NEXT_PUBLIC_APP_URL, default port 3000
 *   - Enterprise (org workspace) app at NEXT_PUBLIC_ENTERPRISE_URL, default port 3001
 *   - Console at NEXT_PUBLIC_CONSOLE_URL, default port 3002
 */

const APP_ORIGIN_DEFAULT = 'http://localhost:3000'
const ORG_ORIGIN_DEFAULT = 'http://localhost:3001'
const CONSOLE_ORIGIN_DEFAULT = 'http://localhost:3002'

function readOrigin(
  value: string | undefined,
  fallback: string,
  codespacePort: number
): string {
  const configured = normalizeValue(value)
  if (configured && !isLocalOrigin(configured)) return configured

  return getCodespaceOrigin(codespacePort) ?? configured ?? fallback
}

/** Base origin for the consumer app. */
export function appOrigin(): string {
  return readOrigin(process.env.NEXT_PUBLIC_APP_URL, APP_ORIGIN_DEFAULT, 3000)
}

/** Base origin for the org workspace app. */
export function orgOrigin(): string {
  return readOrigin(process.env.NEXT_PUBLIC_ORG_URL, ORG_ORIGIN_DEFAULT, 3001)
}

/** Base origin for the Console app. */
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

/** Absolute URL for any path in the consumer app. */
export function appUrl(path: string): string {
  return buildUrl(appOrigin(), path)
}

/** Absolute URL for a path in the org workspace app. */
export function orgWorkspaceUrl(path: string): string {
  return buildUrl(orgOrigin(), path)
}

/** Absolute URL for a path in the Console app. */
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

function getCodespaceOrigin(port: number): string | null {
  const codespaceName = normalizeValue(process.env.CODESPACE_NAME)
  const forwardingDomain = normalizeValue(
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  )

  if (!codespaceName || !forwardingDomain) return null

  return `https://${codespaceName}-${port}.${forwardingDomain}`
}
