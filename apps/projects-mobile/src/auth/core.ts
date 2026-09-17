import { z } from 'zod'

import { coreEndpoints } from '../constants'
import type { OrgMembership } from '../types'

const membershipSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    status: z.string(),
    permissions: z.array(z.string()),
    organization: z.object({
      id: z.string(),
      name: z.string().nullable(),
      slug: z.string(),
      status: z.string(),
      logo_url: z.string().nullable(),
    }),
  })
  .transform(
    (membership) =>
      ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        permissions: membership.permissions,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          status: membership.organization.status,
          logoUrl: membership.organization.logo_url,
        },
      }) satisfies OrgMembership
  )

const membershipListSchema = z.object({
  object: z.literal('list'),
  data: z.array(membershipSchema),
})

const userinfoSchema = z.object({ sub: z.string() }).passthrough()

async function authorizedGet(
  path: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<unknown> {
  const response = await fetchImpl(path, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 401) throw new Error('unauthorized')
  if (!response.ok)
    throw new Error(`Core request failed with status ${response.status}.`)
  return response.json()
}

export async function fetchUserId(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const body = await authorizedGet(
    coreEndpoints().userinfo,
    accessToken,
    fetchImpl
  )
  return userinfoSchema.parse(body).sub
}

export async function fetchMemberships(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<OrgMembership[]> {
  const body = await authorizedGet(
    coreEndpoints().memberships,
    accessToken,
    fetchImpl
  )
  return membershipListSchema.parse(body).data
}
