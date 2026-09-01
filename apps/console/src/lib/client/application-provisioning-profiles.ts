import type {
  ApplicationProvisioningProfile,
  ApplicationProvisioningProfileCreateParams,
  ApplicationProvisioningProfilePolicyReplaceParams,
  ApplicationProvisioningProfileUpdateParams,
} from '@876/core/types/application-provisioning-profile'
import type {
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningValidation,
} from '@876/platform/compat'

import { request } from './request'

const basePath = (appId: string) =>
  `/api/apps/${encodeURIComponent(appId)}/provisioning/profiles`

const profilePath = (appId: string, profileKey: string) =>
  `${basePath(appId)}/${encodeURIComponent(profileKey)}`

export const applicationProvisioningProfiles = {
  list(appId: string) {
    return request<ApplicationProvisioningProfile[]>(basePath(appId), {
      method: 'GET',
    })
  },

  retrieve(appId: string, profileKey: string) {
    return request<ApplicationProvisioningProfile>(
      profilePath(appId, profileKey),
      { method: 'GET' }
    )
  },

  create(appId: string, body: ApplicationProvisioningProfileCreateParams) {
    return request<ApplicationProvisioningProfile>(basePath(appId), {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  update(
    appId: string,
    profileKey: string,
    body: ApplicationProvisioningProfileUpdateParams
  ) {
    return request<ApplicationProvisioningProfile>(
      profilePath(appId, profileKey),
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    )
  },

  retrievePolicy(appId: string, profileKey: string) {
    return request<{
      object: 'application_provisioning_profile_policy'
      app_id: string
      app_slug: string
      profile_id: string
      profile_key: string
      conditions: ApplicationProvisioningProfile['conditions']
      updated_at: number
    }>(`${profilePath(appId, profileKey)}/policy`, { method: 'GET' })
  },

  replacePolicy(
    appId: string,
    profileKey: string,
    body: ApplicationProvisioningProfilePolicyReplaceParams
  ) {
    return request<{
      object: 'application_provisioning_profile_policy'
      app_id: string
      app_slug: string
      profile_id: string
      profile_key: string
      conditions: ApplicationProvisioningProfile['conditions']
      updated_at: number
    }>(`${profilePath(appId, profileKey)}/policy`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  retrieveManifest(appId: string, profileKey: string) {
    return request<AdminProvisioningManifest>(
      `${profilePath(appId, profileKey)}/manifest`,
      { method: 'GET' }
    )
  },

  replaceDraft(
    appId: string,
    profileKey: string,
    body: AdminProvisioningDraftReplaceParams
  ) {
    return request<AdminProvisioningManifestRevision>(
      `${profilePath(appId, profileKey)}/draft`,
      { method: 'PUT', body: JSON.stringify(body) }
    )
  },

  validate(
    appId: string,
    profileKey: string,
    body: AdminProvisioningDraftReplaceParams
  ) {
    return request<AdminProvisioningValidation>(
      `${profilePath(appId, profileKey)}/validate`,
      { method: 'POST', body: JSON.stringify(body) }
    )
  },

  publish(appId: string, profileKey: string) {
    return request<AdminProvisioningManifestRevision>(
      `${profilePath(appId, profileKey)}/publish`,
      { method: 'POST' }
    )
  },
}
