import { createHash } from 'node:crypto'

/**
 * Local parts an organization may never be assigned on the shared platform
 * sending domain. Some are protocol-mandated mailboxes (RFC 2142), the rest
 * would let one organization's mail read as if 876 itself, or another
 * organization's function, had sent it.
 */
const RESERVED_LOCAL_PARTS = new Set([
  '876',
  'abuse',
  'admin',
  'administrator',
  'billing',
  'bounce',
  'bounces',
  'help',
  'hostmaster',
  'info',
  'mailer-daemon',
  'noreply',
  'no-reply',
  'notifications',
  'postmaster',
  'root',
  'sales',
  'security',
  'support',
  'system',
  'webmaster',
])

const MAX_LOCAL_PART_LENGTH = 48
const DISAMBIGUATOR_LENGTH = 6

/**
 * Sanitization is not injective — `acme.co` and `acme-co` both reduce to
 * `acme-co` — so a caller that needs a globally unique address must be prepared
 * to disambiguate. This returns the preferred form only.
 */
export function normalizeManagedLocalPart(organizationSlug: string): string {
  const base = organizationSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LOCAL_PART_LENGTH)
    .replace(/-+$/g, '')

  return base
}

/**
 * A short, stable discriminator derived from the organization's own id, so the
 * same organization always resolves to the same address across retries and
 * environments. Never random.
 */
export function managedDisambiguator(organizationId: string): string {
  return createHash('sha256')
    .update(organizationId, 'utf8')
    .digest('hex')
    .slice(0, DISAMBIGUATOR_LENGTH)
}

export function isReservedManagedLocalPart(localPart: string): boolean {
  return RESERVED_LOCAL_PARTS.has(localPart)
}

/**
 * Candidate local parts for a `managed` sender, most preferred first. The caller
 * walks them in order and takes the first that is not already claimed by another
 * organization, which keeps the address deterministic per organization while
 * preserving the invariant that two organizations never share a from-address.
 *
 * The slug is a durable, server-owned organization identifier — never a display
 * name a user can edit. See .agents/rules/email.md.
 */
export function managedLocalPartCandidates(input: {
  organizationId: string
  organizationSlug: string
}): string[] {
  const disambiguator = managedDisambiguator(input.organizationId)
  const base = normalizeManagedLocalPart(input.organizationSlug)

  if (!base || isReservedManagedLocalPart(base)) return [`org-${disambiguator}`]

  const suffixed = `${base.slice(
    0,
    MAX_LOCAL_PART_LENGTH - DISAMBIGUATOR_LENGTH - 1
  )}-${disambiguator}`.replace(/-{2,}/g, '-')

  return [base, suffixed]
}

export function managedSenderAddress(
  localPart: string,
  platformSendingDomain: string
): string {
  return `${localPart}@${platformSendingDomain}`
}
