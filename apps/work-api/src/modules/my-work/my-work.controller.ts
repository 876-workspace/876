import type { Request, Response } from 'express'

import { getPrincipal } from '../../http/auth/index.js'
import { sendWorkError, sendWorkResult } from '../../http/result.js'
import * as service from './my-work.service.js'
import { myWorkParamsSchema, myWorkQuerySchema } from './my-work.schemas.js'

export async function retrieveMyWork(req: Request, res: Response) {
  const { organizationId } = myWorkParamsSchema.parse(req.params)
  const query = myWorkQuerySchema.parse(req.query)
  const principal = getPrincipal(req)
  const userId = principal.userId ?? query.user_id
  if (!userId) return sendWorkError(res, 'work/invalid-request')

  return sendWorkResult(
    res,
    await service.retrieve(organizationId, userId, query.from, query.to)
  )
}
