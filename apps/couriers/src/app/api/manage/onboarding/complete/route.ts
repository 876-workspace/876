import 'server-only'

import { apiJson } from '@876/core/api'
import { toSlug } from '@876/core/utils'

import { getPlatformClient } from '@/lib/clients/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { ONBOARDING_COUNTRY, ORGANIZATION_TARGET_KEY } from '@/lib/onboarding'
import { loadCouriersProvisioningManifest } from '@/lib/provisioning/manifest'
import { couriersOperator } from '@/lib/clients/couriers'

export const runtime = 'nodejs'

export async function POST() {
  const ctx = await getManageContext()
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role === 'staff') return errorResponse('auth/forbidden')
  if (ctx.accessStatus === 'blocked')
    return errorResponse('auth/account-on-hold')

  const platform = await getPlatformClient()

  const orgSubmit = await platform.onboarding.submit(
    ctx.orgId,
    'organization',
    ORGANIZATION_TARGET_KEY,
    ONBOARDING_COUNTRY
  )
  if (orgSubmit.error) return errorResponse('onboarding/incomplete')

  const appSession = await platform.onboarding.retrieve(
    ctx.orgId,
    'application',
    COURIERS_APP_SLUG,
    ONBOARDING_COUNTRY
  )
  if (appSession.error || !appSession.data)
    return errorResponse('onboarding/answers-unavailable')

  const answers = appSession.data.answers
  const platformName =
    typeof answers.platform_name === 'string'
      ? answers.platform_name.trim()
      : ''
  if (!platformName) return errorResponse('onboarding/platform-name-required')

  const mailboxPrefix =
    typeof answers.mailbox_prefix === 'string' && answers.mailbox_prefix.trim()
      ? answers.mailbox_prefix.trim().toUpperCase()
      : null

  const appSubmit = await platform.onboarding.submit(
    ctx.orgId,
    'application',
    COURIERS_APP_SLUG,
    ONBOARDING_COUNTRY
  )
  if (appSubmit.error) return errorResponse('onboarding/incomplete')

  const prov = await platform.subscriptions.create(ctx.orgId, {
    appSlug: COURIERS_APP_SLUG,
  })
  if (prov.error) return errorResponse('onboarding/activation-failed')

  const provisioning = await loadCouriersProvisioningManifest().catch(() => null)
  if (!provisioning)
    return errorResponse('onboarding/provisioning-unavailable')

  let tenantId = ctx.tenant?.id
  if (!tenantId) {
    const created = await couriersOperator.tenants.create({
      org_id: ctx.orgId,
      name: platformName,
      slug: toSlug(platformName),
      creator_user_id: ctx.userId,
    })
    if (created.error) return errorResponse(created.error.code)

    tenantId = created.data.id
  }

  const reconciled = await couriersOperator.packageCategories.reconcile(
    tenantId,
    {
      revision: provisioning.revision,
      categories: provisioning.packageCategories.map((category) => ({
        key: category.key,
        name: category.name,
        description: category.description,
        icon: category.icon,
        sort_order: category.sortOrder,
        is_active: category.isActive,
      })),
    }
  )
  if (reconciled.error) return errorResponse('onboarding/provisioning-failed')

  if (mailboxPrefix) {
    const updated = await couriersOperator.tenants.update(tenantId, {
      mailbox_prefix: mailboxPrefix,
    })
    if (updated.error) return errorResponse(updated.error.code)
  }

  return apiJson({
    data: {
      object: 'onboarding_completion',
      tenant_id: tenantId,
      access_status: 'active',
    },
  })
}
