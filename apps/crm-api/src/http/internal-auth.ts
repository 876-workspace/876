import type { NextFunction, Request, Response } from 'express'

export function requireInternal(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expected = process.env.CRM_INTERNAL_KEY
  const provided = req.header('x-internal-key')
  if (!expected || !provided || provided !== expected)
    return res.status(401).json({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })

  next()
}
