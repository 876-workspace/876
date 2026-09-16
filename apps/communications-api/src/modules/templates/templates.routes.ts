import { Router, type Request } from 'express'
import { z } from 'zod'

import type { OrganizationScopedParams } from '../../http/organization-params.js'
import { sendError, sendList, sendResult } from '../../http/result.js'
import {
  createEmailTemplateSchema,
  renderEmailTemplateSchema,
  updateEmailTemplateSchema,
} from '../../types/communications.js'
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  renderTemplate,
  resolveTemplate,
  retrieveTemplate,
  updateTemplate,
} from './templates.service.js'

const resolveQuerySchema = z.object({
  category: z.string().trim().min(1).max(120),
  templateId: z.string().trim().min(1).optional(),
})

export function buildTemplateRoutes() {
  const router = Router({ mergeParams: true })

  router.get('/', async (req: Request<OrganizationScopedParams>, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')
    return sendList(res, await listTemplates(organizationId), req.originalUrl)
  })

  router.post('/', async (req: Request<OrganizationScopedParams>, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const parsed = createEmailTemplateSchema.safeParse(req.body)
    if (!parsed.success)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await createTemplate(organizationId, parsed.data), 201)
  })

  // Registered before /:templateId so "resolve" cannot be consumed as an id.
  router.get('/resolve', async (req: Request<OrganizationScopedParams>, res) => {
    const organizationId = req.params.organizationId
    const parsed = resolveQuerySchema.safeParse(req.query)
    if (!organizationId || !parsed.success)
      return sendError(res, 'communications/invalid-request')

    return sendResult(
      res,
      await resolveTemplate(
        organizationId,
        parsed.data.category,
        parsed.data.templateId
      )
    )
  })

  router.get(
    '/:templateId',
    async (
      req: Request<OrganizationScopedParams & { templateId: string }>,
      res
    ) => {
      const { organizationId, templateId } = req.params
      if (!organizationId || !templateId)
        return sendError(res, 'communications/invalid-request')
      return sendResult(res, await retrieveTemplate(organizationId, templateId))
    }
  )

  router.patch(
    '/:templateId',
    async (
      req: Request<OrganizationScopedParams & { templateId: string }>,
      res
    ) => {
      const { organizationId, templateId } = req.params
      if (!organizationId || !templateId)
        return sendError(res, 'communications/invalid-request')

      const parsed = updateEmailTemplateSchema.safeParse(req.body)
      if (!parsed.success)
        return sendError(res, 'communications/invalid-request')

      return sendResult(
        res,
        await updateTemplate(organizationId, templateId, parsed.data)
      )
    }
  )

  router.post(
    '/:templateId/render',
    async (
      req: Request<OrganizationScopedParams & { templateId: string }>,
      res
    ) => {
      const { organizationId, templateId } = req.params
      if (!organizationId || !templateId)
        return sendError(res, 'communications/invalid-request')

      const parsed = renderEmailTemplateSchema.safeParse(req.body)
      if (!parsed.success)
        return sendError(res, 'communications/invalid-request')

      return sendResult(
        res,
        await renderTemplate(organizationId, templateId, parsed.data)
      )
    }
  )

  router.delete(
    '/:templateId',
    async (
      req: Request<OrganizationScopedParams & { templateId: string }>,
      res
    ) => {
      const { organizationId, templateId } = req.params
      if (!organizationId || !templateId)
        return sendError(res, 'communications/invalid-request')

      const actorId = req.header('x-actor-id')?.trim() || null
      return sendResult(
        res,
        await deleteTemplate(organizationId, templateId, actorId)
      )
    }
  )

  return router
}
