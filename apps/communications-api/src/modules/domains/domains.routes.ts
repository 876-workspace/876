import { Router } from 'express'

import { sendError, sendList, sendResult } from '../../http/result.js'
import { createEmailDomainSchema } from '../../types/communications.js'
import {
  createDomain,
  deleteDomain,
  listDomains,
  refreshDomain,
  retrieveDomain,
  verifyDomain,
} from './domains.service.js'

export function buildDomainRoutes() {
  const router = Router({ mergeParams: true })

  router.get('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const result = await listDomains(organizationId)
    return sendList(res, result, req.originalUrl)
  })

  router.post('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const parsed = createEmailDomainSchema.safeParse(req.body)
    if (!parsed.success)
      return sendError(res, 'communications/invalid-request')

    const result = await createDomain(organizationId, parsed.data)
    return sendResult(res, result, 201)
  })

  router.get('/:domainId', async (req, res) => {
    const { organizationId, domainId } = req.params
    if (!organizationId || !domainId)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await retrieveDomain(organizationId, domainId))
  })

  router.post('/:domainId/verify', async (req, res) => {
    const { organizationId, domainId } = req.params
    if (!organizationId || !domainId)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await verifyDomain(organizationId, domainId))
  })

  router.post('/:domainId/refresh', async (req, res) => {
    const { organizationId, domainId } = req.params
    if (!organizationId || !domainId)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await refreshDomain(organizationId, domainId))
  })

  router.delete('/:domainId', async (req, res) => {
    const { organizationId, domainId } = req.params
    if (!organizationId || !domainId)
      return sendError(res, 'communications/invalid-request')

    const actorId = req.header('x-actor-id')?.trim() || null
    return sendResult(res, await deleteDomain(organizationId, domainId, actorId))
  })

  return router
}
