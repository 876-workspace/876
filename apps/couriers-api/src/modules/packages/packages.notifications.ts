import { communicationsService } from '@/lib/clients/communications'
import { retrieveTenant } from '@/modules/tenants'
import { idempotencyHash } from '@/platform/idempotency'
import { getLogger } from '@/platform/logger'
import { retrieveCustomer } from '@/providers/billing/customers'

import * as repo from './packages.repository'
import type { Package } from './packages.schemas'

const log = getLogger('packages.notifications')

export type PackageNotificationCategory =
  'shipment-received' | 'shipment-ready' | 'shipment-delivered'

export type PackageNotificationResult =
  | {
      notified: true
      category: PackageNotificationCategory
      deliveryId: string
    }
  | { notified: false; reason: string }

export type ShipmentVariables = {
  organizationName: string
  customerName: string
  trackingNumber: string
  packageDescription: string
  statusLabel: string
  branchName: string
}

const statusLabelForCategory: Record<PackageNotificationCategory, string> = {
  'shipment-received': 'received',
  'shipment-ready': 'ready for pickup',
  'shipment-delivered': 'collected',
}

export function notificationCategoryForStatus(
  status: Package['status']
): PackageNotificationCategory | null {
  switch (status) {
    case 'RECEIVED':
      return 'shipment-received'
    case 'READY_FOR_PICKUP':
      return 'shipment-ready'
    case 'COLLECTED':
      return 'shipment-delivered'
    default:
      return null
  }
}

export function notificationIdempotencyKey(
  tenantId: string,
  packageId: string,
  category: PackageNotificationCategory
): string {
  return `couriers-${category}:${idempotencyHash(
    JSON.stringify({ tenantId, packageId, category })
  )}`
}

export function buildShipmentVariables(input: {
  organizationName: string
  customerName: string
  trackingNumber: string | null
  packageDescription: string | null
  category: PackageNotificationCategory
  branchName: string | null
  packageId: string
}): ShipmentVariables {
  return {
    organizationName: input.organizationName,
    customerName: input.customerName,
    trackingNumber: input.trackingNumber?.trim() || input.packageId,
    packageDescription: input.packageDescription?.trim() || 'your package',
    statusLabel: statusLabelForCategory[input.category],
    branchName: input.branchName?.trim() || 'your branch',
  }
}

function skipped(
  reason: string,
  context: Record<string, unknown>,
  event: string
): PackageNotificationResult {
  log.info(context, event)
  return { notified: false, reason }
}

/**
 * Email the customer after a package status change. A notification is a side
 * effect of the courier operation, never part of it: this function never
 * throws, so awaiting it cannot fail, roll back, or 500 the package update.
 */
export async function notifyPackageStatusChanged(options: {
  tenantId: string
  previousStatus: Package['status']
  pkg: Package
}): Promise<PackageNotificationResult> {
  try {
    return await sendPackageStatusNotification(options)
  } catch (error) {
    // This path is an unexpected failure, so keep it observable: the reason code
    // alone cannot be debugged.
    log.error(
      {
        tenantId: options.tenantId,
        packageId: options.pkg.id,
        errorCode: 'internal-error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'packages.notification_failed'
    )
    return { notified: false, reason: 'internal-error' }
  }
}

async function sendPackageStatusNotification(options: {
  tenantId: string
  previousStatus: Package['status']
  pkg: Package
}): Promise<PackageNotificationResult> {
  const { tenantId, previousStatus, pkg } = options

  if (pkg.tenant_id !== tenantId)
    return skipped(
      'cross-tenant',
      { tenantId, packageId: pkg.id },
      'packages.notification_skipped'
    )

  if (pkg.status === previousStatus)
    return skipped(
      'status-unchanged',
      { tenantId, packageId: pkg.id, status: pkg.status },
      'packages.notification_skipped'
    )

  const category = notificationCategoryForStatus(pkg.status)
  if (!category)
    return skipped(
      'status-not-notifiable',
      { tenantId, packageId: pkg.id, status: pkg.status },
      'packages.notification_skipped'
    )

  let organizationId: string
  let organizationName: string
  try {
    const tenant = await retrieveTenant(tenantId)
    organizationId = tenant.org_id
    organizationName = tenant.name
  } catch {
    log.warn(
      { tenantId, packageId: pkg.id },
      'packages.notification_tenant_missing'
    )
    return { notified: false, reason: 'tenant-not-found' }
  }

  const profile = await repo.findTenantCustomerById(tenantId, pkg.customer_id)
  if (!profile) {
    log.warn(
      { tenantId, packageId: pkg.id },
      'packages.notification_customer_missing'
    )
    return { notified: false, reason: 'customer-profile-not-found' }
  }

  const branch = pkg.branch_id
    ? await repo.findTenantBranchById(tenantId, pkg.branch_id)
    : null

  const registry = await retrieveCustomer(
    organizationId,
    profile.billingCustomerId
  )
  if (registry.error) {
    log.warn(
      {
        tenantId,
        packageId: pkg.id,
        errorCode: registry.error.code,
      },
      'packages.notification_registry_unavailable'
    )
    return { notified: false, reason: 'registry-unavailable' }
  }

  const email = registry.data.email?.trim() || null
  if (!email)
    return skipped(
      'customer-no-email',
      { tenantId, packageId: pkg.id },
      'packages.notification_skipped'
    )
  const customerName =
    registry.data.companyName?.trim() ||
    registry.data.name?.trim() ||
    'Customer'

  const communications = communicationsService()

  const template = await communications.templates.resolve(
    organizationId,
    category
  )
  if (template.error) {
    log.error(
      {
        tenantId,
        packageId: pkg.id,
        errorCode: template.error.code,
        category,
      },
      'packages.notification_template_unavailable'
    )
    return { notified: false, reason: 'template-unavailable' }
  }

  let senderId = template.data.senderId
  if (!senderId) {
    const senders = await communications.senders.list(organizationId)
    if (senders.error) {
      log.error(
        {
          tenantId,
          packageId: pkg.id,
          errorCode: senders.error.code,
          category,
        },
        'packages.notification_sender_unavailable'
      )
      return { notified: false, reason: 'sender-unavailable' }
    }
    senderId =
      senders.data.data.find(
        (candidate) => candidate.isActive && candidate.isDefault
      )?.id ?? null
  }
  if (!senderId) {
    log.warn(
      { tenantId, packageId: pkg.id, category },
      'packages.notification_sender_missing'
    )
    return { notified: false, reason: 'sender-unavailable' }
  }

  const variables = buildShipmentVariables({
    organizationName,
    customerName,
    trackingNumber: pkg.tracking_num,
    packageDescription: pkg.description,
    category,
    branchName: branch?.name ?? null,
    packageId: pkg.id,
  })
  const rendered = await communications.templates.render(
    organizationId,
    template.data.id,
    { variables }
  )
  if (rendered.error) {
    log.error(
      {
        tenantId,
        packageId: pkg.id,
        errorCode: rendered.error.code,
        category,
      },
      'packages.notification_render_failed'
    )
    return { notified: false, reason: 'render-failed' }
  }

  const delivery = await communications.deliveries.create(organizationId, {
    senderId,
    to: [{ email, name: customerName }],
    cc: [],
    bcc: [],
    subject: rendered.data.subject,
    html: rendered.data.html,
    ...(rendered.data.text ? { text: rendered.data.text } : {}),
    resourceType: 'package',
    resourceId: pkg.id,
    templateId: template.data.id,
    idempotencyKey: notificationIdempotencyKey(tenantId, pkg.id, category),
  })
  if (delivery.error) {
    log.error(
      {
        tenantId,
        packageId: pkg.id,
        errorCode: delivery.error.code,
        category,
      },
      'packages.notification_delivery_failed'
    )
    return { notified: false, reason: 'delivery-failed' }
  }

  log.info(
    {
      tenantId,
      packageId: pkg.id,
      deliveryId: delivery.data.id,
      category,
    },
    'packages.notification_sent'
  )
  return { notified: true, category, deliveryId: delivery.data.id }
}
