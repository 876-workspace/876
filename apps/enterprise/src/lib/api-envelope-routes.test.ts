import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const API_ROOT = resolve(process.cwd(), 'src/app/api')

describe('Enterprise route envelopes', () => {
  const routeFiles = findRouteFiles(API_ROOT).filter(
    (path) => !path.endsWith('/health/route.ts')
  )

  it.each(routeFiles)('%s uses a canonical response helper', (path) => {
    const source = readFileSync(path, 'utf8')

    expect(source).toMatch(/\b(?:apiError|apiJson|apiSuccess)\b/)
    expect(source).not.toMatch(/\b(?:NextResponse|Response)\.json\s*\(/)
  })
})

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteFiles(path)

    return entry.name === 'route.ts' ? [relative(process.cwd(), path)] : []
  })
}
