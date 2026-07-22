import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Tenant } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import { ok, err } from '../result'
import { roles } from '../roles'

export async function create(params: {
  orgId: string
  name: string
  slug: string
  ownerUserId?: string
}): ServiceResult<Pick<Tenant, 'id'>> {
  try {
    const now = nowUnixSeconds()

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
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

      await roles.ensureDefaults(created.id, tx)

      if (params.ownerUserId) {
        const adminRole = await tx.role.findUnique({
          where: {
            roles_tenant_id_system_key_key: {
              tenantId: created.id,
              systemKey: 'admin',
            },
          },
          select: { id: true },
        })
        if (!adminRole)
          throw new Error('Admin role provisioning did not complete.')

        await tx.teamMember.create({
          data: {
            tenantId: created.id,
            userId: params.ownerUserId,
            roleId: adminRole.id,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          },
        })
      }

      return created
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
