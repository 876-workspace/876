import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Disposable-email-domain screening.
 *
 * Ported from `utils/email.py`. The list is loaded once at module scope from a
 * newline-delimited data file, exactly as the Python does — this is static I/O
 * whose result is identical for every request, so reading it per call would buy
 * nothing (`.claude/rules/performance-server-side.md` §3.5).
 *
 * The file is optional. `utils/email.py` resolves it to a path that does not
 * exist in this repository, so `DISPOSABLE_DOMAINS` is empty in the running
 * FastAPI service and `is_disposable_email_domain` always returns `false`
 * today. That behaviour is reproduced rather than "fixed": populating the list
 * here would start rejecting sign-ups the service currently accepts, which is a
 * product decision and not part of a port.
 */

const DATA_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'disposable-email-domains.txt'
)

function loadDisposableDomains(): ReadonlySet<string> {
  const domains = new Set<string>()
  try {
    for (const line of readFileSync(DATA_FILE, 'utf-8').split('\n')) {
      const domain = line.trim().toLowerCase()
      if (domain) domains.add(domain)
    }
  } catch {
    // An absent or unreadable file means "no domains are blocked", matching the
    // Python, which swallows the same failure.
  }
  return domains
}

export const DISPOSABLE_DOMAINS = loadDisposableDomains()

/**
 * Whether an address's domain — or any of its parent domains — is disposable.
 *
 * The parent walk stops one label short of the public suffix, so a two-label
 * domain is only matched in full: `mail.example.com` tests `example.com` but
 * never the bare `com`.
 */
export function isDisposableEmailDomain(
  email: string,
  domains: ReadonlySet<string> = DISPOSABLE_DOMAINS
): boolean {
  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.lastIndexOf('@')
  if (atIndex < 0 || atIndex === normalized.length - 1) return false

  const domain = normalized.slice(atIndex + 1)
  if (domains.has(domain)) return true

  const parts = domain.split('.')
  for (let index = 1; index < parts.length - 1; index += 1) {
    if (domains.has(parts.slice(index).join('.'))) return true
  }
  return false
}
