import { createRouteHandler } from 'uploadthing/next'

import { uploadRouter } from './core'

export const runtime = 'nodejs'

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
})
