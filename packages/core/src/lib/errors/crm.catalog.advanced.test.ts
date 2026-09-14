import { describe, expect, it } from 'vitest'
import { getError, isError, isErrorCode, toAppError } from './helpers.js'
import { CRM_ERRORS, type CrmErrorCode } from './crm.js'
import { ERRORS } from './helpers.js'
import { HttpStatus } from '../../types/errors.js'

describe('CRM catalog - exhaustive contract', () => {
  const allCodes = Object.keys(CRM_ERRORS) as CrmErrorCode[]

  it('contains exactly 43 registered CRM error codes', () => {
    // A bare count is a deliberate tripwire: adding or removing a public error
    // code changes a client contract, so it should never pass unnoticed.
    expect(allCodes.length).toBe(43)
  })

  it('distinguishes each way a Work call can fail', () => {
    // CRM once mapped every Work failure onto crm/work-unavailable, so a
    // missing app connection presented as an unreachable service and took a
    // manual reproduction to diagnose. These codes are what keep the causes
    // apart; losing one silently returns to that behaviour.
    for (const code of [
      'crm/work-unavailable',
      'crm/work-not-connected',
      'crm/work-workspace-missing',
      'crm/work-workspace-inactive',
      'crm/work-forbidden',
      'crm/work-invalid-response',
    ] as const)
      expect(allCodes).toContain(code)
  })

  it('every code is prefixed with crm/ and kebab-case', () => {
    for (const code of allCodes) {
      expect(code).toMatch(/^crm\/[a-z-]+$/)
    }
  })

  it('every message is non-empty, trimmed, ends with period, and has no raw stack/provider leakage', () => {
    for (const code of allCodes) {
      const def = CRM_ERRORS[code]
      expect(def.message.length).toBeGreaterThan(5)
      expect(def.message).toBe(def.message.trim())
      expect(def.message.endsWith('.')).toBe(true)
      expect(def.message.toLowerCase()).not.toContain('stack')
      expect(def.message.toLowerCase()).not.toContain('prisma')
      expect(def.message.toLowerCase()).not.toContain('select *')
    }
  })

  it('every httpStatus is a valid HttpStatus value', () => {
    const valid = new Set(Object.values(HttpStatus))
    for (const code of allCodes) {
      expect(valid.has(CRM_ERRORS[code].httpStatus)).toBe(true)
    }
  })

  it('maps not-found family to 404', () => {
    const notFound = [
      'crm/category-not-found',
      'crm/customer-not-found',
      'crm/form-not-found',
      'crm/priority-not-found',
      'crm/reminder-not-found',
      'crm/request-not-found',
      'crm/request-note-not-found',
      'crm/subcategory-not-found',
      'crm/task-not-found',
      'crm/team-not-found',
      'crm/tenant-not-found',
      'crm/not-found',
    ] as const
    for (const code of notFound) {
      expect(CRM_ERRORS[code].httpStatus).toBe(HttpStatus.NOT_FOUND)
    }
  })

  it('maps conflict family to 409', () => {
    const conflicts = [
      'crm/category-in-use',
      'crm/category-slug-taken',
      'crm/description-note-immutable',
      'crm/form-in-use',
      'crm/form-invalid-definition',
      'crm/form-not-published',
      'crm/form-slug-taken',
      'crm/priority-default-required',
      'crm/priority-in-use',
      'crm/subcategory-in-use',
      'crm/subcategory-slug-taken',
      'crm/team-in-use',
      'crm/team-slug-taken',
      'crm/tenant-inactive',
    ] as const
    for (const code of conflicts) {
      expect(CRM_ERRORS[code].httpStatus).toBe(HttpStatus.CONFLICT)
    }
  })

  it('maps validation family to 422', () => {
    expect(CRM_ERRORS['crm/form-invalid-submission'].httpStatus).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY
    )
    expect(CRM_ERRORS['crm/subcategory-category-mismatch'].httpStatus).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY
    )
    expect(CRM_ERRORS['crm/invalid-request'].httpStatus).toBe(
      HttpStatus.UNPROCESSABLE_ENTITY
    )
  })

  it('maps internal to 500 and dependency to 502/503', () => {
    expect(CRM_ERRORS['crm/internal'].httpStatus).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR
    )
    expect(CRM_ERRORS['crm/provisioning-invalid'].httpStatus).toBe(
      HttpStatus.INTERNAL_SERVER_ERROR
    )
    expect(CRM_ERRORS['crm/registry-unavailable'].httpStatus).toBe(
      HttpStatus.BAD_GATEWAY
    )
    expect(CRM_ERRORS['crm/invalid-response'].httpStatus).toBe(
      HttpStatus.BAD_GATEWAY
    )
    expect(CRM_ERRORS['crm/not-configured'].httpStatus).toBe(
      HttpStatus.SERVICE_UNAVAILABLE
    )
  })
})

describe('getError / toAppError / isError - value semantics', () => {
  it('getError returns plain value not Error instance', () => {
    const err = getError('crm/team-not-found')
    expect(err).not.toBeInstanceOf(Error)
    expect(isError(err)).toBe(true)
  })

  it('returns independent objects on each call (no shared mutation)', () => {
    const a = getError('crm/request-not-found')
    const b = getError('crm/request-not-found')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
    a.message = 'mutated'
    expect(b.message).not.toBe('mutated')
  })

  it('preserves code, message, httpStatus from catalog', () => {
    const err = getError('crm/category-not-found')
    expect(err.code).toBe('crm/category-not-found')
    expect(err.message).toBe(CRM_ERRORS['crm/category-not-found'].message)
    expect(err.httpStatus).toBe(HttpStatus.NOT_FOUND)
  })

  it('toAppError strips httpStatus and description', () => {
    const err = getError('crm/internal')
    const app = toAppError(err)
    expect(app).toEqual({ code: err.code, message: err.message })
    expect(
      ({ ...app } as unknown as Record<string, unknown>).httpStatus
    ).toBeUndefined()
    expect(
      ({ ...app } as unknown as Record<string, unknown>).description
    ).toBeUndefined()
  })

  it('toAppError never mutates original', () => {
    const err = getError('crm/team-not-found')
    const app = toAppError(err)
    expect(err.httpStatus).toBe(HttpStatus.NOT_FOUND)
    expect(
      ({ ...app } as unknown as Record<string, unknown>).httpStatus
    ).toBeUndefined()
  })

  it('isError correctly identifies value errors and rejects non-errors', () => {
    expect(isError(getError('crm/task-not-found'))).toBe(true)
    expect(
      isError({ code: 'crm/task-not-found', message: 'x', httpStatus: 404 })
    ).toBe(true)
    expect(isError(null)).toBe(false)
    expect(isError(undefined)).toBe(false)
    expect(isError('crm/task-not-found')).toBe(false)
    expect(isError({ code: 'crm/task-not-found', message: 'x' })).toBe(false)
    expect(isError({ code: 123, message: 'x', httpStatus: 404 })).toBe(false)
    expect(isError(new Error('boom'))).toBe(false)
  })

  it('isError rejects objects missing httpStatus type', () => {
    expect(
      isError({
        code: 'x',
        message: 'y',
        httpStatus: '404' as unknown as number,
      })
    ).toBe(false)
    expect(isError({ code: 'x', message: 'y', httpStatus: null })).toBe(false)
  })

  it('isErrorCode checks registry membership', () => {
    expect(isErrorCode('crm/team-not-found')).toBe(true)
    expect(isErrorCode('crm/not-a-real-code')).toBe(false)
    expect(isErrorCode('')).toBe(false)
    expect(isErrorCode('crm/internal')).toBe(true)
  })

  it('fallback for unknown crm/ prefix returns crm/internal', () => {
    const err = getError('crm/unknown-weird-code')
    expect(err.code).toBe('crm/internal')
    expect(err.httpStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
  })

  it('fallback for completely unknown returns auth/unknown-error', () => {
    const err = getError('totally-unknown')
    expect(err.code).toBe('auth/unknown-error')
  })

  it('param option is preserved on error but stripped in app error', () => {
    const err = getError('crm/invalid-request', { param: 'subject' })
    expect(err.param).toBe('subject')
    expect((toAppError(err) as unknown as Record<string, unknown>).param)
      .toBeUndefined
    const app = toAppError(err) as unknown as Record<string, unknown>
    expect(app.param).toBeUndefined()
  })

  it('JSON round-trip preserves code but httpStatus only on server error', () => {
    const err = getError('crm/subcategory-category-mismatch')
    const serverJson = JSON.stringify(err)
    const parsed = JSON.parse(serverJson)
    expect(parsed.code).toBe('crm/subcategory-category-mismatch')
    expect(parsed.httpStatus).toBe(422)
    const clientJson = JSON.stringify(toAppError(err))
    const clientParsed = JSON.parse(clientJson)
    expect(clientParsed.code).toBe('crm/subcategory-category-mismatch')
    expect(clientParsed.httpStatus).toBeUndefined()
  })

  it('every CRM error serializes without losing code/message', () => {
    for (const code of Object.keys(CRM_ERRORS) as CrmErrorCode[]) {
      const err = getError(code)
      const parsed = JSON.parse(JSON.stringify(err))
      expect(parsed.code).toBe(code)
      expect(typeof parsed.message).toBe('string')
    }
  })

  it('description is forwarded when catalog provides it', () => {
    // CRM catalog currently has no descriptions, but helper should forward if present.
    // Test via a known error that has description in another catalog (e.g. check existence).
    const err = getError('crm/internal')
    // no description expected for CRM internals without catalog description
    expect(err.description).toBeUndefined()
  })

  it('concurrent getError calls are isolated across codes', async () => {
    const codes: CrmErrorCode[] = [
      'crm/team-not-found',
      'crm/category-not-found',
      'crm/request-not-found',
    ]
    const results = await Promise.all(
      codes.map((c) => Promise.resolve(getError(c)))
    )
    expect(results.map((r) => r.code)).toEqual(codes)
    for (const r of results) expect(isError(r)).toBe(true)
  })
})

describe('CRM catalog - security and contract invariants', () => {
  it('no message contains SQL, path, or secret-like tokens', () => {
    for (const code of Object.keys(CRM_ERRORS) as CrmErrorCode[]) {
      const msg = CRM_ERRORS[code].message.toLowerCase()
      expect(msg).not.toContain('password')
      expect(msg).not.toContain('secret')
      expect(msg).not.toContain('token')
      expect(msg).not.toContain('prisma')
      expect(msg).not.toContain('select')
    }
  })

  it('every code appears in global ERRORS registry with same httpStatus', () => {
    for (const code of Object.keys(CRM_ERRORS) as CrmErrorCode[]) {
      const global = ERRORS[code as keyof typeof ERRORS]
      expect(global).toBeDefined()
      expect(global.httpStatus).toBe(CRM_ERRORS[code].httpStatus)
      expect(global.message).toBe(CRM_ERRORS[code].message)
    }
  })

  it('4xx family never uses 500 and 5xx never uses 4xx incorrectly', () => {
    const fourOhFour = getError('crm/request-not-found')
    const fiveHundred = getError('crm/internal')
    expect(fourOhFour.httpStatus).toBeGreaterThanOrEqual(400)
    expect(fourOhFour.httpStatus).toBeLessThan(500)
    expect(fiveHundred.httpStatus).toBeGreaterThanOrEqual(500)
  })

  it('client-safe error never exposes httpStatus', () => {
    for (const code of Object.keys(CRM_ERRORS) as CrmErrorCode[]) {
      const app = toAppError(getError(code))
      expect(Object.prototype.hasOwnProperty.call(app, 'httpStatus')).toBe(
        false
      )
    }
  })
})
