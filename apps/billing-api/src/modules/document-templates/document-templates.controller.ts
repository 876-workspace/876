import type { Request, Response } from 'express'
import { getPrincipal } from '@/http/auth'
import { validBody, validParams, validQuery } from '@/http/middleware/validate'
import type { DocumentTemplateType } from '@876/core/document-templates'
import type { BrandingUpdate } from '@876/core/branding'
import type {
  DocumentTemplateCreateBody,
  DocumentTemplateUpdateBody,
} from './document-templates.schemas'
import { documentTemplatesService as service } from './document-templates.service'

function tenant(req: Request) {
  const tenantId = getPrincipal(req).tenantId
  if (!tenantId)
    throw new Error('Document template guard did not resolve a tenant.')
  return tenantId
}
function actor(req: Request) {
  return getPrincipal(req).userId
}

export const documentTemplatesController = {
  async list(req: Request, res: Response) {
    const { documentType } = validQuery<{
      documentType?: DocumentTemplateType
    }>(req)
    res.json(await service.list(tenant(req), documentType))
  },
  async retrieve(req: Request, res: Response) {
    res.json(
      await service.retrieve(
        tenant(req),
        validParams<{ templateId: string }>(req).templateId
      )
    )
  },
  async create(req: Request, res: Response) {
    res
      .status(201)
      .json(
        await service.create(
          tenant(req),
          validBody<DocumentTemplateCreateBody>(req),
          actor(req)
        )
      )
  },
  async update(req: Request, res: Response) {
    res.json(
      await service.update(
        tenant(req),
        validParams<{ templateId: string }>(req).templateId,
        validBody<DocumentTemplateUpdateBody>(req),
        actor(req)
      )
    )
  },
  async setDefault(req: Request, res: Response) {
    res.json(
      await service.setDefault(
        tenant(req),
        validParams<{ templateId: string }>(req).templateId,
        actor(req)
      )
    )
  },
  async delete(req: Request, res: Response) {
    res.json(
      await service.delete(
        tenant(req),
        validParams<{ templateId: string }>(req).templateId,
        actor(req)
      )
    )
  },
  async resolve(req: Request, res: Response) {
    const query = validQuery<{
      documentType: DocumentTemplateType
      templateId?: string
    }>(req)
    res.json(
      await service.resolve(tenant(req), query.documentType, query.templateId)
    )
  },
  async retrieveBranding(req: Request, res: Response) {
    res.json(await service.retrieveBranding(tenant(req)))
  },
  async updateBranding(req: Request, res: Response) {
    res.json(
      await service.updateBranding(
        tenant(req),
        validBody<BrandingUpdate>(req),
        actor(req)
      )
    )
  },
}
