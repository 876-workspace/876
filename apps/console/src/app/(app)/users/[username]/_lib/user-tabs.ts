import type { RouteTabItem } from '@876/ui/route-tabs'

/**
 * The user detail tab set.
 *
 * Only Contacts depends on data, and `hideUnlessActive` already hides it
 * whenever the user is not on that route — so building the set with
 * `hasContacts: false` produces a correct, fully clickable tab strip that merely
 * omits one conditional tab. That is what lets the strip render instantly while
 * the contact count streams in behind it, instead of the whole header waiting on
 * a second round trip just to decide whether one tab is visible.
 *
 * Billing rather than Invoices: an enterprise member has no invoices of their
 * own, so that tab resolves by account shape and links out to the organization's
 * billing instead of rendering the organization's money on a person's page.
 */
export function userTabs(base: string, hasContacts: boolean): RouteTabItem[] {
  return [
    { label: 'Overview', href: base, exact: true },
    { label: 'Relationships', href: `${base}/relationships` },
    { label: 'Apps', href: `${base}/apps` },
    {
      label: 'Contacts',
      href: `${base}/contacts`,
      hideUnlessActive: !hasContacts,
    },
    { label: 'Billing', href: `${base}/billing` },
    { label: 'Requests', href: `${base}/tickets` },
    { label: 'Notes', href: `${base}/notes` },
    { label: 'Security', href: `${base}/security` },
    { label: 'Audit', href: `${base}/audit` },
  ]
}
