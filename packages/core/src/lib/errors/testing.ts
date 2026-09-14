import { expect } from 'vitest'

import { HttpStatus, type ErrorDef } from '../../types/errors.js'

const LEAKAGE_PATTERN = /stack|prisma|postgres|select|todo|fixme/
const CODE_PATTERN = /^[a-z-]+\/[a-z-]+$/

/**
 * Shared registry contract assertion for product error catalogs.
 *
 * Each product registry runs this to enforce the platform error contract:
 * unique kebab-case codes, valid HTTP statuses, and safe messages.
 * Registry membership and client-envelope round-trips are asserted by the
 * owning package with its local helpers, since product codes are not
 * members of the core registry.
 */
export function assertValidErrorRegistry(
  registry: Record<string, ErrorDef>,
  options?: { namespace?: string; exactCount?: number }
): void {
  const codes = Object.keys(registry)

  if (options?.exactCount !== undefined)
    expect(codes.length).toBe(options.exactCount)

  expect(new Set(codes).size).toBe(codes.length)

  const validStatuses = new Set(Object.values(HttpStatus))

  for (const code of codes) {
    expect(code).toMatch(CODE_PATTERN)
    if (options?.namespace)
      expect(code.startsWith(`${options.namespace}/`)).toBe(true)
    const [namespace] = code.split('/')
    expect(namespace.length).toBeGreaterThan(0)

    const definition = registry[code]
    const { message } = definition
    expect(message).toBe(message.trim())
    expect(message.length).toBeGreaterThanOrEqual(10)
    expect(message.length).toBeLessThanOrEqual(200)
    expect(message.endsWith('.')).toBe(true)
    expect(message.toLowerCase()).not.toMatch(LEAKAGE_PATTERN)

    expect(validStatuses.has(definition.httpStatus)).toBe(true)
  }
}
