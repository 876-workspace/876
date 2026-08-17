import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'

const log = getLogger('billing-workspace-lifecycle')

export type WorkspaceLifecycleAction = 'archive' | 'restore'

/**
 * Applies an organization's deletion or restoration to its Billing workspace.
 *
 * A workspace must not outlive the organization it belongs to: 876 Billing
 * gates every tenant-scoped call on an `ACTIVE` tenant, so a workspace left
 * active after its organization was deleted keeps answering for an organization
 * that no longer exists. Billing suspends and tombstones the workspace rather
 * than dropping it — the invoices, payments, and ledger entries inside are
 * records we are obliged to retain.
 *
 * Best-effort, and deliberately so: it mirrors the Billing customer archive
 * beside it, where a delivery failure is logged rather than rolling back a
 * delete the operator already asked for. Failures are logged at `error` with
 * the organization id so they can be replayed.
 */
export async function applyBillingWorkspaceLifecycle(params: {
  organizationId: string
  action: WorkspaceLifecycleAction
  deletedBy?: string | null
  reason?: string | null
}): Promise<void> {
  const settings = getSettings()
  const billingUrl = settings.billing.url.trim().replace(/\/+$/, '')
  const internalKey = settings.billing.internalKey.trim()

  if (!billingUrl || !internalKey) {
    log.error(
      {
        organization_id: params.organizationId,
        action: params.action,
        has_billing_url: Boolean(billingUrl),
        has_internal_key: Boolean(internalKey),
      },
      'billing_workspace.not_configured'
    )
    return
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(
      `${billingUrl}/api/v1/internal/tenants/lifecycle`,
      {
        method: 'POST',
        headers: {
          'x-internal-key': internalKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: params.organizationId,
          action: params.action,
          deletedBy: params.deletedBy ?? null,
          reason: params.reason ?? null,
        }),
        signal: controller.signal,
      }
    )
    if (!response.ok) {
      const snippet = (await response.text()).slice(0, 500).trim()
      log.error(
        {
          organization_id: params.organizationId,
          action: params.action,
          status: response.status,
          body: snippet,
        },
        'billing_workspace.failed'
      )
      return
    }
    log.info(
      { organization_id: params.organizationId, action: params.action },
      'billing_workspace.applied'
    )
  } catch (error) {
    log.error(
      {
        err: error,
        organization_id: params.organizationId,
        action: params.action,
      },
      'billing_workspace.failed'
    )
  } finally {
    clearTimeout(timer)
  }
}
