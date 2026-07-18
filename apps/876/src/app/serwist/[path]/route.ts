import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createSerwistRoute } from '@serwist/turbopack'

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf-8',
  }).stdout.trim() || randomUUID()

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: '/~offline', revision }],
    swSrc: 'src/app/sw.ts',
    useNativeEsbuild: true,
  })
