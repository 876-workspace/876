/**
 * The customer card's tabs, in display order.
 *
 * Each tab is a real route segment, so a tab is linkable, shareable, and
 * survives a reload — `/customers/<id>/mails` opens on Mails. `segment: null`
 * is the index route (Overview), which is what a bare `/customers/<id>` shows.
 *
 * Plain data with no icons or functions: this list crosses the RSC → client
 * boundary into the tab strip.
 */
export type CustomerTab = {
  /** Path segment under `/customers/<id>`; `null` for the index (Overview). */
  segment: string | null
  label: string
}

export const CUSTOMER_TABS: CustomerTab[] = [
  { segment: null, label: 'Overview' },
  { segment: 'contacts', label: 'Contacts' },
  { segment: 'transactions', label: 'Transactions' },
  { segment: 'requests', label: 'Requests' },
  { segment: 'mails', label: 'Mails' },
  { segment: 'statement', label: 'Statement' },
  { segment: 'activity', label: 'Activity' },
]

/** Path for one customer tab. Query state is attached separately by the caller. */
export function customerTabPath(customerId: string, segment: string | null) {
  const base = `/customers/${encodeURIComponent(customerId)}`
  return segment ? `${base}/${segment}` : base
}
