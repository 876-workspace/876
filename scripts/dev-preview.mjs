/**
 * Resolves the remote dev workspace's port-forwarding host pattern.
 *
 * The monorepo runs several apps that must reach each other over browser-visible
 * origins during development. Locally those origins are `http://localhost:<port>`,
 * but inside a remote workspace each port is forwarded to its own HTTPS hostname,
 * and the two providers we support shape that hostname differently:
 *
 *   GitHub Codespaces  https://<name>-<port>.app.github.dev      (port as suffix)
 *   Ona / Gitpod       https://<port>--<env-id>.<cluster>.gitpod.dev  (port as prefix)
 *
 * Rather than teach every consumer both shapes, everything downstream reads a
 * single `DEV_PREVIEW_HOST_TEMPLATE` — a hostname containing a literal `{port}`
 * placeholder. `scripts/setup-dev-env.mjs` writes it into the per-app env files,
 * so Next.js apps, the FastAPI seeds, and any future provider all share one
 * contract instead of provider-specific branches.
 *
 * @module scripts/dev-preview
 */
import { spawnSync } from 'node:child_process'

/** Env var holding the `{port}` hostname template (e.g. `{port}--abc.gitpod.dev`). */
export const HOST_TEMPLATE_ENV = 'DEV_PREVIEW_HOST_TEMPLATE'

/** Placeholder replaced with the forwarded port number. */
export const PORT_PLACEHOLDER = '{port}'

function fromExplicitEnv() {
  const template = process.env[HOST_TEMPLATE_ENV]?.trim()
  if (!template) return null

  return template.includes(PORT_PLACEHOLDER) ? template : null
}

function fromCodespaces() {
  const space = process.env.CODESPACE_NAME?.trim()
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?.trim()
  if (!space || !domain) return null

  return `${space}-${PORT_PLACEHOLDER}.${domain}`
}

/**
 * Asks the Ona CLI for this environment's canonical host.
 *
 * `status.environmentUrls.ssh.url` is `https://<env-id>.<cluster>.gitpod.dev:443`
 * and is present whenever the environment is running — unlike the per-port URLs,
 * which only exist once a port has been opened. Forwarded ports are that same
 * host with a `<port>--` prefix.
 */
function fromOna() {
  const result = spawnSync('ona', ['environment', 'get', '-o', 'json'], {
    encoding: 'utf8',
    timeout: 30_000,
  })
  if (result.error || result.status !== 0) return null

  let payload
  try {
    payload = JSON.parse(result.stdout)
  } catch {
    return null
  }

  const environment = Array.isArray(payload) ? payload[0] : payload
  const sshUrl = environment?.status?.environmentUrls?.ssh?.url
  if (typeof sshUrl !== 'string') return null

  const host = sshUrl.replace(/^https?:\/\//, '').replace(/:\d+$/, '')
  if (!host) return null

  return `${PORT_PLACEHOLDER}--${host}`
}

/**
 * Resolves the forwarded-host template for the current workspace.
 *
 * @returns The template, or `null` when running on a plain local machine.
 */
export function resolveHostTemplate() {
  return fromExplicitEnv() ?? fromCodespaces() ?? fromOna()
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
