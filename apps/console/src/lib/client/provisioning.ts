import type {
  AdminDeletedProvisioningNote,
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifest,
  AdminProvisioningManifestRevision,
  AdminProvisioningNote,
  AdminProvisioningValidation,
} from '@876/admin'

import { request } from './request'

const path = (appId: string) =>
  `/api/apps/${encodeURIComponent(appId)}/provisioning`

export const retrieve = (appId: string) =>
  request<AdminProvisioningManifest>(path(appId), { method: 'GET' })

export const replaceDraft = (
  appId: string,
  params: AdminProvisioningDraftReplaceParams
) =>
  request<AdminProvisioningManifestRevision>(path(appId), {
    method: 'PUT',
    body: JSON.stringify(params),
  })

export const publish = (appId: string) =>
  request<AdminProvisioningManifestRevision>(`${path(appId)}/publish`, {
    method: 'POST',
  })

export const validate = (
  appId: string,
  params: AdminProvisioningDraftReplaceParams
) =>
  request<AdminProvisioningValidation>(`${path(appId)}/validate`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const createNote = (
  appId: string,
  params: { body: string; author_user_id?: string | null }
) =>
  request<AdminProvisioningNote>(`${path(appId)}/notes`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const deleteNote = (appId: string, noteId: string) =>
  request<AdminDeletedProvisioningNote>(
    `${path(appId)}/notes/${encodeURIComponent(noteId)}`,
    { method: 'DELETE' }
  )

export const provisioning = {
  retrieve,
  replaceDraft,
  publish,
  validate,
  createNote,
  deleteNote,
}
