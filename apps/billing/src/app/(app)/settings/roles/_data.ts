import 'server-only'

import { cache } from 'react'

import { service } from '@/lib/service'
import type { RoleResource } from '@/types/access'

export const loadRoles = cache(
  async (tenantId: string): Promise<RoleResource[]> =>
    service.roles.list(tenantId)
)

export const loadRole = cache(
  async (tenantId: string, roleId: string) =>
    service.roles.retrieve(tenantId, roleId) as Promise<RoleResource | null>
)
