import { Router } from 'express'

import { sendError, sendList, sendResult } from '../../http/result.js'
import {
  createEmailSenderSchema,
  updateEmailSenderSchema,
} from '../../types/communications.js'
import {
  createSender,
  deleteSender,
  listSenders,
  retrieveSender,
  updateSender,
} from './senders.service.js'

export function buildSenderRoutes() {
  const router = Router({ mergeParams: true })

  router.get('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')
    return sendList(res, await listSenders(organizationId), req.originalUrl)
  })

  router.post('/', async (req, res) => {
    const organizationId = req.params.organizationId
    if (!organizationId) return sendError(res, 'communications/invalid-request')

    const parsed = createEmailSenderSchema.safeParse(req.body)
    if (!parsed.success)
      return sendError(res, 'communications/invalid-request')

    return sendResult(res, await createSender(organizationId, parsed.data), 201)
  })

  router.get('/:senderId', async (req, res) => {
    const { organizationId, senderId } = req.params
    if (!organizationId || !senderId)
      return sendError(res, 'communications/invalid-request')
    return sendResult(res, await retrieveSender(organizationId, senderId))
  })

  router.patch('/:senderId', async (req, res) => {
    const { organizationId, senderId } = req.params
    if (!organizationId || !senderId)
      return sendError(res, 'communications/invalid-request')

    const parsed = updateEmailSenderSchema.safeParse(req.body)
    if (!parsed.success)
      return sendError(res, 'communications/invalid-request')

    return sendResult(
      res,
      await updateSender(organizationId, senderId, parsed.data)
    )
  })

  router.delete('/:senderId', async (req, res) => {
    const { organizationId, senderId } = req.params
    if (!organizationId || !senderId)
      return sendError(res, 'communications/invalid-request')

    const actorId = req.header('x-actor-id')?.trim() || null
    return sendResult(
      res,
      await deleteSender(organizationId, senderId, actorId)
    )
  })

  return router
}
