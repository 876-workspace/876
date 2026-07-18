import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Tenant } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import { ok, err } from '../result'

export async function create(params: {
  orgId: string
  name: string
  slug: string
}): ServiceResult<Pick<Tenant, 'id'>> {
  try {
    const now = nowUnixSeconds()

    const tenant = await prisma.tenant.create({
      data: {
        orgId: params.orgId,
        slug: params.slug,
        name: params.name,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        domains: {
          create: {
            hostname: `${params.slug}.couriers.876.app`,
            isPrimary: true,
            verified: true,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      include: { domains: true },
    })

    return ok({ id: tenant.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : ''
    if (message.includes('Unique constraint') || message.includes('unique')) {
      return err('That subdomain is already taken. Please choose another.', 409)
    }
    console.error('[service.tenants.create]', e)
    return err('Failed to create tenant.', 500)
  }
}
