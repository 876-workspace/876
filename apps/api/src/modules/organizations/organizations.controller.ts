import type { Request, Response } from 'express'

import { getPrincipal } from '@/http/auth/principal'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'

import type {
  InviteCreateBody,
  ListOrganizationsQuery,
  OrganizationCreateBody,
  OrganizationUpdateBody,
  OrgProfileUpdateBody,
  OrgSetupBody,
  SearchOrganizationsQuery,
  SubscriptionProvisionBody,
  SubscriptionUpdateBody,
} from './organizations.schemas'
import * as service from './organizations.service'

export async function listOrganizations(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<ListOrganizationsQuery>(req)
  res.status(200).json(await service.listOrganizations(query))
}

export async function createOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<OrganizationCreateBody>(req)
  res.status(201).json(await service.createOrganization(body))
}

export async function bootstrapOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<{
    ownerUserId: string
    name: string
    slug?: string | null
  }>(req)
  res.status(201).json(await service.bootstrapOrganization(body))
}

export async function setupOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const body = validBody<OrgSetupBody>(req)
  res.status(200).json(await service.setupOrganization(body))
}

export async function retrieveOrganizationBySlug(
  req: Request,
  res: Response
): Promise<void> {
  const { slug } = validParams<{ slug: string }>(req)
  const query = validQuery<{ include_deleted?: boolean }>(req)
  res
    .status(200)
    .json(
      await service.retrieveOrganizationBySlug(
        slug,
        query.include_deleted ?? false
      )
    )
}

export async function searchOrganizations(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<SearchOrganizationsQuery>(req)
  res.status(200).json(await service.searchOrganizations(query))
}

export async function retrieveOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const query = validQuery<{ include_deleted?: boolean }>(req)
  res
    .status(200)
    .json(
      await service.retrieveOrganization(
        organization_id,
        query.include_deleted ?? false
      )
    )
}

export async function updateOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const body = validBody<OrganizationUpdateBody>(req)
  res.status(200).json(await service.updateOrganization(organization_id, body))
}

export async function retrieveOrganizationProfile(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  res
    .status(200)
    .json(
      await service.retrieveOrganizationProfile(
        organization_id,
        getPrincipal(req)
      )
    )
}

export async function updateOrganizationProfile(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const body = validBody<OrgProfileUpdateBody>(req)
  res
    .status(200)
    .json(
      await service.updateOrganizationProfile(
        organization_id,
        body,
        getPrincipal(req)
      )
    )
}

export async function deleteOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const query = req.query as { deleted_by?: string; reason?: string }
  res
    .status(200)
    .json(
      await service.deleteOrganization(
        organization_id,
        query.deleted_by ?? null,
        query.reason ?? null
      )
    )
}

export async function purgeOrganization(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const query = req.query as { deleted_by?: string }
  res
    .status(200)
    .json(
      await service.purgeOrganization(organization_id, query.deleted_by ?? null)
    )
}

export async function listOrganizationMemberships(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const query = validQuery<{
    limit: number
    starting_after?: string
    ending_before?: string
  }>(req)
  res
    .status(200)
    .json(await service.listOrganizationMemberships(organization_id, query))
}

export async function createOrganizationMembership(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const body = validBody<{
    user_id: string
    role?: string | null
    status?: string | null
  }>(req)
  res
    .status(201)
    .json(await service.createOrganizationMembership(organization_id, body))
}

export async function listOrganizationInvites(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const query = validQuery<{
    limit: number
    starting_after?: string
    ending_before?: string
  }>(req)
  res
    .status(200)
    .json(
      await service.listOrganizationInvites(
        organization_id,
        getPrincipal(req),
        query
      )
    )
}

export async function createOrganizationInvite(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id } = validParams<{ organization_id: string }>(req)
  const body = validBody<InviteCreateBody>(req)
  res
    .status(201)
    .json(
      await service.createOrganizationInvite(
        organization_id,
        getPrincipal(req),
        body
      )
    )
}

export async function revokeOrganizationInvite(
  req: Request,
  res: Response
): Promise<void> {
  const { organization_id, invite_id } = validParams<{
    organization_id: string
    invite_id: string
  }>(req)
  res
    .status(200)
    .json(
      await service.revokeOrganizationInvite(
        organization_id,
        invite_id,
        getPrincipal(req)
      )
    )
}

export async function getInvitePreview(
  req: Request,
  res: Response
): Promise<void> {
  const { token } = validParams<{ token: string }>(req)
  res.status(200).json(await service.getInvitePreview(token))
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const { token } = validParams<{ token: string }>(req)
  const query = validQuery<{ userId: string }>(req)
  res.status(200).json(await service.acceptInvite(token, query.userId))
}

export async function batchListSubscriptions(
  req: Request,
  res: Response
): Promise<void> {
  const query = validQuery<{ organization_ids: string }>(req)
  res
    .status(200)
    .json(await service.batchListSubscriptions(query.organization_ids))
}

export async function listOrgSubscriptions(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res.status(200).json(await service.listOrgSubscriptions(org_id))
}

export async function provisionSubscription(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<SubscriptionProvisionBody>(req)
  res.status(201).json(await service.provisionSubscription(org_id, body))
}

export async function getSubscriptionBySlug(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, app_slug } = validParams<{
    org_id: string
    app_slug: string
  }>(req)
  res.status(200).json(await service.getSubscriptionBySlug(org_id, app_slug))
}

export async function getSubscription(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, app_id } = validParams<{ org_id: string; app_id: string }>(
    req
  )
  res.status(200).json(await service.getSubscription(org_id, app_id))
}

export async function updateSubscription(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, app_id } = validParams<{ org_id: string; app_id: string }>(
    req
  )
  const body = validBody<SubscriptionUpdateBody>(req)
  res.status(200).json(await service.updateSubscription(org_id, app_id, body))
}

export async function listMyOrgSubscriptions(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  res
    .status(200)
    .json(await service.listMyOrgSubscriptions(org_id, getPrincipal(req)))
}

export async function retrieveMyOrgSubscriptionBySlug(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id, app_slug } = validParams<{
    org_id: string
    app_slug: string
  }>(req)
  res
    .status(200)
    .json(
      await service.retrieveMyOrgSubscriptionBySlug(
        org_id,
        app_slug,
        getPrincipal(req)
      )
    )
}

export async function provisionMyOrgSubscription(
  req: Request,
  res: Response
): Promise<void> {
  const { org_id } = validParams<{ org_id: string }>(req)
  const body = validBody<SubscriptionProvisionBody>(req)
  res
    .status(201)
    .json(
      await service.provisionMyOrgSubscription(org_id, body, getPrincipal(req))
    )
}
