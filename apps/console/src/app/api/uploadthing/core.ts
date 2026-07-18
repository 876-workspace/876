import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

const f = createUploadthing()

export const uploadRouter = {
  appIcon: f({
    image: {
      maxFileSize: '2MB',
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { caller, response } =
        await requireConsolePermission('console:apps')
      if (response)
        throw new UploadThingError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions.',
        })

      return { userId: caller.id }
    })
    .onUploadComplete(({ file }) => ({
      url: file.ufsUrl,
      key: file.key,
    })),
} satisfies FileRouter

export type UploadRouter = typeof uploadRouter
