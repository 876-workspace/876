import 'server-only'

import { apiJson } from '@876/core/api'
import { toSlug } from '@876/core/utils'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { ONBOARDING_COUNTRY, ORGANIZATION_TARGET_KEY } from '@/lib/onboarding'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function POST() {
  const ctx = await getManageContext()
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role === 'member')
    return apiJson({ error: 'Insufficient permissions' }, { status: 403 })
  if (ctx.accessStatus === 'blocked')
    return apiJson({ error: 'Access is restricted' }, { status: 403 })

  const platform = await getPlatformClient()

  const orgSubmit = await platform.onboarding.submit(
    ctx.orgId,
    'organization',
    ORGANIZATION_TARGET_KEY,
    ONBOARDING_COUNTRY
  )
  if (orgSubmit.error)
    return apiJson(
      { error: 'Complete the business profile step first.' },
      { status: 422 }
    )

  const appSession = await platform.onboarding.retrieve(
    ctx.orgId,
    'application',
    COURIERS_APP_SLUG,
    ONBOARDING_COUNTRY
  )
  if (appSession.error || !appSession.data)
    return apiJson({ error: 'Failed to load setup answers.' }, { status: 500 })

  const answers = appSession.data.answers
  const platformName =
    typeof answers.platform_name === 'string'
      ? answers.platform_name.trim()
      : ''
  if (!platformName)
    return apiJson(
      { error: 'Provide your platform name in the setup step.' },
      { status: 422 }
    )

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
  if (appSubmit.error)
    return apiJson({ error: 'Complete the setup step first.' }, { status: 422 })

  const prov = await platform.orgs.subscriptions.provision(ctx.orgId, {
    appSlug: COURIERS_APP_SLUG,
  })
  if (prov.error)
    return apiJson({ error: 'Failed to activate workspace.' }, { status: 500 })

  let tenantId = ctx.tenant?.id
  if (!tenantId) {
    const created = await service.tenants.create({
      orgId: ctx.orgId,
      name: platformName,
      slug: toSlug(platformName),
    })
    if (created.error)
      return apiJson({ error: created.error }, { status: created.status })

    const createdTenant = created.data
    if (!createdTenant)
      return apiJson({ error: 'Failed to create tenant.' }, { status: 500 })

    tenantId = createdTenant.id
  }

  if (mailboxPrefix) await service.tenants.update(tenantId, { mailboxPrefix })

  return apiJson({
    data: {
      object: 'onboarding_completion',
      tenant_id: tenantId,
      access_status: 'active',
    },
  })
}
