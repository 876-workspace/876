import { listEntitledModules } from '@/modules/modules'
import type { OrgAccessPrincipal } from '@/modules/organizations'

import type { AppMembership } from './app-access.schemas'
import { retrieveMyAppMembership } from './app-access.service'

/**
 * Adds organization module entitlements to the acting member's own app profile.
 *
 * Admin membership lists stay focused on identity/access data. Product apps use
 * this self read during request bootstrap, so module availability can travel with
 * effective permissions without exposing the admin-tier modules resource.
 */
export async function retrieveMyAppRuntimeMembership(
  organizationId: string,
  appId: string,
  principal: OrgAccessPrincipal
): Promise<AppMembership> {
  const membership = await retrieveMyAppMembership(
    organizationId,
    appId,
    principal
  )

  if (!membership.entitled) return { ...membership, entitled_modules: [] }

  const modules = await listEntitledModules({ organizationId, appId })
  return {
    ...membership,
    entitled_modules: modules.data.map((module) => module.key),
  }
}
