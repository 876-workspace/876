import type { AdminUser, AdminUserCreateParams } from '@876/admin'

import { $876 } from '@/lib/876'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/**
 * Create a platform user, optionally bootstrapping an organization and an
 * owner membership in the same call.
 */
export async function create(
  params: AdminUserCreateParams & { organization_name?: string | null }
): ServiceResult<AdminUser & { warning?: string }> {
  const { organization_name, ...userParams } = params

  const { data: user, error: userError } = await $876.users.create(userParams)
  if (userError || !user) {
    return err(userError?.message ?? 'Failed to create user.')
  }

  if (organization_name?.trim()) {
    const { data: org, error: orgError } = await $876.orgs.create({
      name: organization_name.trim(),
    })
    if (orgError || !org) {
      return ok(user, 'User created but organization could not be created.')
    }

    const { error: membershipError } = await $876.memberships.create({
      user_id: user.id,
      organization_id: org.id,
      role: 'owner',
      status: 'active',
    })
    if (membershipError) {
      return ok(
        user,
        'User and organization created but membership could not be established.'
      )
    }
  }

  return ok(user)
}
