import { isError } from '@876/core'
import { Router, type Request, type Response } from 'express'

import * as account from './sync-account.service.js'
import {
  oauthCallbackQuerySchema,
  oauthProviderParamsSchema,
} from './sync-connections.schemas.js'

function page(res: Response, status: number, title: string, message: string) {
  return res.status(status).type('html').send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body><main><h1>${title}</h1><p>${message}</p></main></body>
</html>`)
}

export function createSyncOauthRouter() {
  const router = Router()

  router.get('/:provider/callback', (req: Request, res: Response, next) => {
    Promise.resolve()
      .then(async () => {
        const { provider } = oauthProviderParamsSchema.parse(req.params)
        const query = oauthCallbackQuerySchema.parse(req.query)
        if (query.error || !query.code)
          return page(
            res,
            400,
            'Calendar authorization not completed',
            'The provider did not grant calendar access. You can close this window and try again.'
          )

        const result = await account.completeOauth({
          provider: provider === 'google' ? 'GOOGLE' : 'MICROSOFT',
          state: query.state,
          code: query.code,
        })
        if (isError(result))
          return page(
            res,
            result.httpStatus,
            'Calendar authorization failed',
            '876 Work could not complete the calendar connection. You can close this window and retry from Calendar settings.'
          )

        return page(
          res,
          200,
          'Calendar connected',
          'Authorization is complete. You can close this window and return to 876 Calendar.'
        )
      })
      .catch(next)
  })

  return router
}
