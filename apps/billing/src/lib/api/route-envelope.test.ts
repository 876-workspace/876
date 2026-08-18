import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_ROOT = resolve(process.cwd())
const API_ROOT = join(APP_ROOT, 'src/app/api')
const RESOURCE_PROXY = join(APP_ROOT, 'src/lib/api/resource-proxy.ts')
const CANONICAL_RESPONSE = /\b(?:apiError|apiJson|apiSuccess)\b/
const RESOURCE_ROUTE_DELEGATE = /\bcreateBillingResourceRoute\b/
const RAW_JSON_RESPONSE = /\b(?:NextResponse|Response)\.json\s*\(/

describe('Billing route envelopes', () => {
  const routeFiles = findRouteFiles(API_ROOT).filter(
    (path) => !path.endsWith('/health/route.ts')
  )

  it.each(routeFiles)('%s uses canonical response transport', (path) => {
    const source = readFileSync(path, 'utf8')
    const usesCanonicalResponse = CANONICAL_RESPONSE.test(source)
    const delegatesToResourceTransport = RESOURCE_ROUTE_DELEGATE.test(source)

    expect(usesCanonicalResponse || delegatesToResourceTransport).toBe(true)
    expect(source).not.toMatch(RAW_JSON_RESPONSE)
  })

  it('keeps delegated resource routes behind the canonical shared transport', () => {
    const source = readFileSync(RESOURCE_PROXY, 'utf8')

    expect(source).toMatch(/\bapiError\b/)
    expect(source).toMatch(/\bproxy876BillingRequest\b/)
    expect(source).not.toMatch(RAW_JSON_RESPONSE)
  })
})

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findRouteFiles(path)
    return entry.name === 'route.ts' ? [relative(process.cwd(), path)] : []
  })
}
