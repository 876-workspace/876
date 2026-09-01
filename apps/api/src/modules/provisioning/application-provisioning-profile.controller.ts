import type { Request, Response } from 'express'

import { validBody, validParams } from '@/http/middleware/validate'

import type {
  ApplicationProvisioningProfileCreate,
  ApplicationProvisioningProfilePolicyReplace,
  ApplicationProvisioningProfileUpdate,
} from './application-provisioning-profile.schemas'
import type { ProvisioningDraftReplace } from './provisioning.schemas'
import * as service from './application-provisioning-profile.service'

type AppParams = { app_key: string }
type ProfileParams = { app_key: string; profile_key: string }

export async function listProfiles(req: Request, res: Response): Promise<void> {
  const { app_key } = validParams<AppParams>(req)
  res
    .status(200)
    .json(await service.listApplicationProvisioningProfiles(app_key))
}

export async function createProfile(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key } = validParams<AppParams>(req)
  const body = validBody<ApplicationProvisioningProfileCreate>(req)
  res
    .status(201)
    .json(await service.createApplicationProvisioningProfile(app_key, body))
}

export async function retrieveProfile(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  res
    .status(200)
    .json(
      await service.retrieveApplicationProvisioningProfile(app_key, profile_key)
    )
}

export async function updateProfile(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  const body = validBody<ApplicationProvisioningProfileUpdate>(req)
  res
    .status(200)
    .json(
      await service.updateApplicationProvisioningProfile(
        app_key,
        profile_key,
        body
      )
    )
}

export async function retrievePolicy(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  res
    .status(200)
    .json(
      await service.retrieveApplicationProvisioningProfilePolicy(
        app_key,
        profile_key
      )
    )
}

export async function replacePolicy(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  const body = validBody<ApplicationProvisioningProfilePolicyReplace>(req)
  res
    .status(200)
    .json(
      await service.replaceApplicationProvisioningProfilePolicy(
        app_key,
        profile_key,
        body
      )
    )
}

export async function retrieveManifest(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  res
    .status(200)
    .json(
      await service.retrieveApplicationProvisioningProfileManifest(
        app_key,
        profile_key
      )
    )
}

export async function retrievePublished(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  res
    .status(200)
    .json(
      await service.retrieveApplicationProvisioningProfilePublished(
        app_key,
        profile_key
      )
    )
}

export async function validateDraft(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  const body = validBody<ProvisioningDraftReplace>(req)
  res
    .status(200)
    .json(
      await service.validateApplicationProvisioningProfileDraft(
        app_key,
        profile_key,
        body
      )
    )
}

export async function replaceDraft(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  const body = validBody<ProvisioningDraftReplace>(req)
  res
    .status(200)
    .json(
      await service.replaceApplicationProvisioningProfileDraft(
        app_key,
        profile_key,
        body
      )
    )
}

export async function publishDraft(
  req: Request,
  res: Response
): Promise<void> {
  const { app_key, profile_key } = validParams<ProfileParams>(req)
  res
    .status(200)
    .json(
      await service.publishApplicationProvisioningProfileDraft(
        app_key,
        profile_key
      )
    )
}
