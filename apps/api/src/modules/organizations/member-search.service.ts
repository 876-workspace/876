import { listObject, type ListObject } from '@/http/envelope'

import {
  requireOrgAppAccessPermission,
  type OrgAccessPrincipal,
} from './app-access-policy.service'
import * as repository from './access.repository'
import type { OrganizationMember } from './access.schemas'
import { serializeOrganizationMember } from './access.serializers'

/** Database-backed organization member search; never falls back to global users. */
export async function listOrgMembersForDirectory(
  organizationId: string,
  principal: OrgAccessPrincipal,
  limit: number,
  query?: string
): Promise<ListObject<OrganizationMember>> {
  await requireOrgAppAccessPermission(organizationId, principal, 'members:read')
  const { data, hasMore } = await repository.listMembersByOrg(
    organizationId,
    limit,
    query?.trim() || undefined
  )
  return listObject({
    data: data.map(serializeOrganizationMember),
    hasMore,
    url: `/organizations/${organizationId}/members`,
  })
}
