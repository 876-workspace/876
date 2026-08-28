import Link from 'next/link'
import { ExclamationTriangleIcon } from '@876/ui/icons'

/**
 * Shown when an operator opens a workspace the organization is not entitled to.
 *
 * It is a notice and not a wall. Entitlement decides what the workspace index
 * offers, so nobody arrives here by browsing — they arrived by a saved link or
 * by deliberately typing the URL, and almost always because the entitlement is
 * exactly what went wrong. Hiding the data at that moment would remove the one
 * view that explains the support ticket.
 *
 * Console is the operator tier: it acts on 876's own authority rather than on a
 * grant the organization made, so an inactive subscription is information here,
 * not a permission boundary. The permission boundary is the Console session and
 * its audited calls, and those still apply.
 */
export function WorkspaceEntitlementNotice({
  appLabel,
  subscriptionsHref,
}: {
  appLabel: string
  subscriptionsHref: string
}) {
  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-[0.8125rem] text-amber-800 dark:text-amber-300"
    >
      <ExclamationTriangleIcon className="size-4 shrink-0" aria-hidden="true" />
      This organization has no active {appLabel} entitlement. Existing data is
      still shown.
      <Link href={subscriptionsHref} className="font-medium underline">
        Review subscriptions
      </Link>
    </p>
  )
}
