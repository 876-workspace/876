/**
 * Resolves the remote dev workspace's port-forwarding host pattern.
 *
 * The monorepo runs several apps that must reach each other over browser-visible
 * origins during development. Locally those origins are `http://localhost:<port>`,
 * but a remote workspace may forward each port to its own HTTPS hostname.
 * Everything downstream reads a
 * single `DEV_PREVIEW_HOST_TEMPLATE` — a hostname containing a literal `{port}`
 * placeholder. `scripts/setup-dev-env.mjs` writes it into the per-app env files,
 * so Next.js apps, the FastAPI seeds, and any future provider all share one
 * contract instead of provider-specific branches.
 *
 * @module scripts/dev-preview
 */
/** Env var holding the `{port}` hostname template. */
export const HOST_TEMPLATE_ENV = 'DEV_PREVIEW_HOST_TEMPLATE'

/** Env var holding the Cloudflare zone used for fixed dev origins. */
export const TUNNEL_DOMAIN_ENV = 'DEV_TUNNEL_DOMAIN'

/** Placeholder replaced with the forwarded port number. */
export const PORT_PLACEHOLDER = '{port}'

function fromExplicitEnv() {
  const template = process.env[HOST_TEMPLATE_ENV]?.trim()
  if (!template) return null

  return template.includes(PORT_PLACEHOLDER) ? template : null
}

/**
 * Resolves the forwarded-host template for the current workspace.
 *
 * @returns The template, or `null` when running on a plain local machine.
 */
export function resolveHostTemplate() {
  return fromExplicitEnv()
}

/**
 * Builds the browser-visible origin for a forwarded port.
 *
 * @param port - The local port the app listens on.
 * @param template - A template from {@link resolveHostTemplate}.
 * @returns An absolute HTTPS origin, or the localhost origin when unforwarded.
 */
export function previewOrigin(port, template) {
  if (!template) return `http://localhost:${port}`

  return `https://${template.replaceAll(PORT_PLACEHOLDER, String(port))}`
}

/**
 * Builds a stable public origin for a service exposed through the shared
 * development tunnel.
 *
 * @param service - Stable service name used as the hostname prefix.
 * @param domain - Cloudflare zone configured for the tunnel.
 * @returns An absolute HTTPS origin.
 */
export function tunnelOrigin(service, domain) {
  return `https://${service}-dev.${domain}`
}
