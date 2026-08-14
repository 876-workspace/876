import type { NextFunction, Request, Response } from 'express'

import { recordRequest } from '@/platform/metrics'

export function metrics(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    recordRequest({
      method: req.method,
      route: req.route?.path ? String(req.route.path) : 'unmatched',
      status: String(res.statusCode),
    })
  })
  next()
}
