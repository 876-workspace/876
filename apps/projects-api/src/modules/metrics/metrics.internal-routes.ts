import { Router, type Request, type Response } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import { getMetricsSummary } from './metrics.service.js'

async function summary(_req: Request, res: Response) {
  return res.json({ data: await getMetricsSummary(), error: null })
}

export function createMetricsInternalRouter(): Router {
  const router = Router()
  router.get('/metrics/summary', requireInternalKey, summary)
  return router
}
