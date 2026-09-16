import { Router } from 'express'

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
  retrieveTemplate,
  updateTemplate,
} from './templates.service.js'

export function buildTemplateRoutes() {
  const router = Router({ mergeParams: true })

  router.get('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')
    return sendList(res, await listTemplates(organizationId), req.originalUrl)
  })

  router.post('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const parsed = createEmailTemplateSchema.safeParse(req.body)
    if (!parsed.success)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await createTemplate(organizationId, parsed.data), 201)
  })

  router.get('/:templateId', async (req, res) => {
    const { organizationId, templateId } = req.params
    if (!organizationId || !templateId)
      return sendError(res, 'communications/invalid-request')
    return sendResult(res, await retrieveTemplate(organizationId, templateId))
  })

  router.patch('/:templateId', async (req, res) => {
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
  })

  router.post('/:templateId/render', async (req, res) => {
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
  })

  router.delete('/:templateId', async (req, res) => {
    const { organizationId, templateId } = req.params
    if (!organizationId || !templateId)
      return sendError(res, 'communications/invalid-request')

    const actorId = req.header('x-actor-id')?.trim() || null
    return sendResult(
      res,
      await deleteTemplate(organizationId, templateId, actorId)
    )
  })

  return router
}
