import { createHash, timingSafeEqual } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

export function secretsMatch(presented: string, configured: string): boolean {
  if (!presented || !configured) return false
  return timingSafeEqual(
    createHash('sha256').update(presented, 'utf8').digest(),
    createHash('sha256').update(configured, 'utf8').digest()
  )
}

export function requireInternal(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.WORK_INTERNAL_KEY
  const provided = req.header('x-internal-key')?.trim()
  if (!expected || !provided || !secretsMatch(provided, expected))
    return res.status(401).json({
      data: null,
      error: { code: 'work/unauthorized', message: 'Unauthorized.' },
    })

  next()
}
