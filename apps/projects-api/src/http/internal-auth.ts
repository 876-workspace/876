import { createHash, timingSafeEqual } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

import { sendProjectsError } from './result.js'

/**
 * Compares two secrets in constant time. Both sides are hashed first so the
 * comparison is length-independent — `timingSafeEqual` throws on differing
 * lengths, and that throw is itself an oracle for the configured key's length.
 */
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
  const expected = process.env.PROJECTS_INTERNAL_KEY
  const provided = req.header('x-internal-key')?.trim()
  if (!expected || !provided || !secretsMatch(provided, expected))
    return sendProjectsError(res, 'projects/unauthorized')

  next()
}

export const requireInternal = requireInternalKey

/**
 * Vercel Cron calls with `Authorization: Bearer $CRON_SECRET` and cannot set
 * custom headers, so scheduled internal routes accept that secret as well as
 * the internal key. An unset secret never matches.
 */
export function requireInternalKeyOrCron(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = req.header('authorization') ?? ''
  const bearer = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
  if (cronSecret && bearer && secretsMatch(bearer, cronSecret)) return next()

  return requireInternalKey(req, res, next)
}
