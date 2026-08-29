import { describe, expect, it } from 'vitest'
import { getError, isError, toAppError } from '@876/core'
import { CRM_ERRORS } from '@876/core/errors'
import { crmError } from './errors.js'
import { HttpStatus } from '@876/core'

describe('CRM errors contract - no httpStatus leakage', () => {
  it('crmError returns same as getError (value semantics)', () => {
    const a = crmError('crm/team-not-found')
    const b = getError('crm/team-not-found')
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })

  it('client error via toAppError never contains httpStatus', () => {
    for (const code of Object.keys(CRM_ERRORS) as Array<keyof typeof CRM_ERRORS>) {
      const app: Record<string, unknown> = { ...toAppError(crmError(code)) }
      expect(app.httpStatus).toBeUndefined()
      expect(Object.keys(app).sort()).toEqual(['code', 'message'])
      expect(app.code).toBe(code)
    }
  })

  it('httpStatus semantics are stable and documented', () => {
    expect(crmError('crm/category-not-found').httpStatus).toBe(HttpStatus.NOT_FOUND)
    expect(crmError('crm/category-in-use').httpStatus).toBe(HttpStatus.CONFLICT)
    expect(crmError('crm/subcategory-category-mismatch').httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
    expect(crmError('crm/form-invalid-submission').httpStatus).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
    expect(crmError('crm/registry-unavailable').httpStatus).toBe(HttpStatus.BAD_GATEWAY)
    expect(crmError('crm/internal').httpStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
  })

  it('all errors are plain values suitable for JSON envelope', () => {
    for (const code of Object.keys(CRM_ERRORS) as Array<keyof typeof CRM_ERRORS>) {
      const err = crmError(code)
      expect(isError(err)).toBe(true)
      expect(err).not.toBeInstanceOf(Error)
      const envelope = { data: null, error: toAppError(err) }
      const parsed = JSON.parse(JSON.stringify(envelope))
      expect(parsed.error.code).toBe(code)
      expect(parsed.data).toBeNull()
    }
  })

  it('CrmHttpError shim still works but is deprecated path', async () => {
    const { CrmHttpError } = await import('./errors.js')
    const e = new CrmHttpError('crm/team-not-found')
    expect(e.code).toBe('crm/team-not-found')
    expect(e.httpStatus).toBe(404)
    expect(e.message).toBe('Team not found.')
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe('CrmHttpError')
  })

  it('CrmHttpError maps provisioning-invalid to 500', async () => {
    const { CrmHttpError } = await import('./errors.js')
    expect(new CrmHttpError('crm/provisioning-invalid').httpStatus).toBe(500)
  })
})

describe('CRM errors - message and status invariants (advanced)', () => {
  it('messages are stable and not empty', () => {
    for (const [code, def] of Object.entries(CRM_ERRORS)) {
      expect(def.message.length, code).toBeGreaterThan(0)
      expect(def.message.trim(), code).toBe(def.message)
    }
  })

  it('no message reveals internal SQL or path', () => {
    for (const [code, def] of Object.entries(CRM_ERRORS)) {
      const low = def.message.toLowerCase()
      expect(low, code).not.toContain('prisma')
      expect(low, code).not.toContain('unexpected token')
    }
  })

  it('409 codes are conflicts, 404 are not-found, 422 are validation', () => {
    const byStatus = Object.entries(CRM_ERRORS).reduce((acc, [code, def]) => {
      const s = def.httpStatus
      acc[s] = acc[s] || []
      acc[s].push(code)
      return acc
    }, {} as Record<number, string[]>)
    expect(byStatus[404].some(c => c.includes('not-found'))).toBe(true)
    expect(byStatus[409].some(c => c.includes('in-use') || c.includes('taken') || c.includes('inactive'))).toBe(true)
    expect(byStatus[422].length).toBeGreaterThan(0)
  })

  it('toAppError envelope can be distinguished from success envelope', () => {
    const err = crmError('crm/request-not-found')
    const errorEnvelope = { data: null, error: toAppError(err) }
    const successEnvelope = { data: { id: 'x' }, error: null }
    expect(errorEnvelope.data).toBeNull()
    expect(errorEnvelope.error).not.toBeNull()
    expect(successEnvelope.error).toBeNull()
    expect(successEnvelope.data).not.toBeNull()
  })
})
