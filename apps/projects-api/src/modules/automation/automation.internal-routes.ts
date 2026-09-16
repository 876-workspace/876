import { Router, type Request, type Response } from 'express'

import {
  requireInternalKey,
  requireInternalKeyOrCron,
} from '../../http/internal-auth.js'
import { drainAutomation } from '../../workers/automation.js'
import { parseDrainLimit } from './automation.controller.js'

async function drain(req: Request, res: Response) {
  const limit = parseDrainLimit(req)
  const result = await drainAutomation(limit)
  return res.json({ data: result, error: null })
}

export function createAutomationInternalRouter(): Router {
  const router = Router()

  router.post('/automation/drain', requireInternalKey, drain)
  router.get('/automation/drain', requireInternalKeyOrCron, drain)

  return router
}
