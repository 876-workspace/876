import type {
  AdminApp,
  AdminAppCreated,
  AdminAppCreateParams,
  AdminAppUpdateParams,
  AdminDeletedApp,
} from '@876/admin'
import type {
  DeletedImageFile,
  ImageFile,
  ImageUploadComplete,
  ImageUploadSession,
  ImageUploadStart,
} from '@/types/storage'

import { request } from './request'

export const create = (params: AdminAppCreateParams) =>
  request<AdminAppCreated>('/api/apps', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (appId: string, params: AdminAppUpdateParams) =>
  request<AdminApp>(`/api/apps/${encodeURIComponent(appId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const remove = (appId: string) =>
  request<AdminDeletedApp>(`/api/apps/${encodeURIComponent(appId)}`, {
    method: 'DELETE',
  })

export const startImageUpload = (appId: string, params: ImageUploadStart) =>
  request<ImageUploadSession>(
    `/api/storage/apps/${encodeURIComponent(appId)}/image`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const completeImageUpload = (
  appId: string,
  params: ImageUploadComplete
) =>
  request<ImageFile>(
    `/api/storage/apps/${encodeURIComponent(appId)}/image/complete`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const removeImage = (appId: string) =>
  request<DeletedImageFile>(
    `/api/storage/apps/${encodeURIComponent(appId)}/image/remove`,
    { method: 'DELETE' }
  )

export const apps = {
  create,
  update,
  remove,
  delete: remove,
  startImageUpload,
  completeImageUpload,
  removeImage,
}
