import { createHash, timingSafeEqual } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

import { sendCommunicationsError } from './result.js'

export function secretsMatch(presented: string, configured: string): boolean {
  if (!presented || !configured) return false

  return timingSafeEqual(
    createHash('sha256').update(presented, 'utf8').digest(),
    createHash('sha256').update(configured, 'utf8').digest()
  )
}

export function requireInternalKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.COMMUNICATIONS_INTERNAL_KEY
  const provided = req.header('x-internal-key')?.trim()
  if (!expected || !provided || !secretsMatch(provided, expected))
    return sendCommunicationsError(res, 'communications/unauthorized')

  next()
}
