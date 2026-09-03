import { createHash, timingSafeEqual } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

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
    return res.status(401).json({
      data: null,
      error: {
        code: 'projects/unauthorized',
        message: 'This request is missing valid credentials.',
      },
    })

  next()
}

export const requireInternal = requireInternalKey
