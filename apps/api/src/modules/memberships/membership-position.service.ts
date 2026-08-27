import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './memberships.repository'
import type {
  CreateMembershipBody,
  Membership,
  UpdateMembershipBody,
} from './memberships.schemas'
import { serializeMembership } from './memberships.serializers'
import {
  createMembership as createMembershipLifecycle,
  updateMembership as updateMembershipLifecycle,
} from './memberships.service'

function membershipNotFound(): AppHttpError {
  return new AppHttpError({
    code: 'membership/not-found',
    message: 'No membership exists with the provided identifier.',
    httpStatus: 404,
  })
}

/**
 * Extends the canonical membership create lifecycle with the core-owned
 * position field without changing the provider/org-role synchronization path.
 */
export async function createMembershipProfile(
  body: CreateMembershipBody
): Promise<Membership> {
  const { position, ...lifecycle } = body
  const created = await createMembershipLifecycle(lifecycle)

  if (position === undefined) return created

  const updated = await repository.updateMembership(created.id, {
    position,
    updatedAt: BigInt(nowUnixSeconds()),
  })
  if (!updated) throw membershipNotFound()

  return serializeMembership(updated)
}

/** Extends the canonical membership lifecycle update with the core-owned position field. */
export async function updateMembershipProfile(
  membershipId: string,
  body: UpdateMembershipBody
): Promise<Membership> {
  const { position, ...lifecycle } = body
  const hasLifecycleUpdate = Object.values(lifecycle).some(
    (value) => value !== undefined
  )

  const lifecycleResult = hasLifecycleUpdate
    ? await updateMembershipLifecycle(membershipId, lifecycle)
    : null

  if (position !== undefined) {
    const updated = await repository.updateMembership(membershipId, {
      position,
      updatedAt: BigInt(nowUnixSeconds()),
    })
    if (!updated) throw membershipNotFound()
    return serializeMembership(updated)
  }

  // The lifecycle update already returns the post-update membership; re-reading
  // it here would add a second round trip to every role/status change.
  if (lifecycleResult) return lifecycleResult

  const row = await repository.findMembershipById(membershipId)
  if (!row) throw membershipNotFound()
  return serializeMembership(row)
}
