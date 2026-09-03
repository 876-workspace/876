import { workspaceIndex } from './app-workspaces'

export type WorkspaceReturn = {
  href: string
  label: string
}

/** Control characters and spaces, which can smuggle a scheme past the checks. */
const UNSAFE_CHARS = /[\u0000-\u0020\u007f]/

/**
 * Reject anything that is not a plain, same-origin path.
 *
 * `from` arrives in the query string, so it is attacker-controlled even though
 * it is only ever rendered as a link. A protocol-relative `//evil.example` or a
 * `javascript:` value would otherwise put an off-site destination behind
 * Console's own back control.
 */
function isSafeReturnPath(value: string): boolean {
  if (!value.startsWith('/')) return false
  // `//host` is protocol-relative, and browsers normalize `/\host` the same
  // way; both leave the origin.
  if (value.startsWith('//') || value.startsWith('/\\')) return false
  if (value.includes('\\')) return false
  return !UNSAFE_CHARS.test(value)
}

/**
 * Where the back control at the top of a workspace returns to.
 *
 * A workspace is reachable from the organization record, from the launcher, and
 * by deep link, and it is no longer nested under any of them — so the route
 * cannot say on its own where an operator came from. The entry point passes
 * `?from=`; without one, the organization record is the honest default, because
 * that is the place the workspace is always linked from.
 *
 * The label is **derived, never passed**, so a crafted `from` cannot put
 * arbitrary text into Console's chrome.
 */
export function resolveWorkspaceReturn(
  from: string | null | undefined,
  orgSlug: string,
  orgName: string
): WorkspaceReturn {
  const orgRecord = `/orgs/${encodeURIComponent(orgSlug)}`

  if (!from || !isSafeReturnPath(from))
    return { href: orgRecord, label: orgName }

  const path = from.split('?')[0] ?? from

  if (path === workspaceIndex(orgSlug))
    return { href: from, label: 'All workspaces' }
  if (path === orgRecord || path.startsWith(`${orgRecord}/`))
    return { href: from, label: orgName }

  return { href: from, label: 'Back' }
}
