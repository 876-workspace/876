import { z } from 'zod'

export const organizationLogoUploadStartSchema = z.strictObject({
  orgSlug: z.string().min(1),
  file_name: z.string().min(1),
  content_type: z.string().min(1),
  size_bytes: z.int().positive(),
})

export const organizationLogoUploadCompleteSchema = z.strictObject({
  orgSlug: z.string().min(1),
  id: z.string().startsWith('upl_'),
})

export interface OrganizationLogoUploadSession {
  object: 'upload_session'
  id: string
  file_id: string
  upload_url: string
  method: 'PUT'
  headers: {
    'Content-Type': string
    'Content-Length': string
  }
  expires_at: number
}

export interface OrganizationLogoFile {
  object: 'file'
  id: string
  status: 'ready'
  url: string
}
