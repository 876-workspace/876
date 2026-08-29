import { describe, expect, it } from 'vitest'
import { getError, isError, toAppError } from './helpers.js'
import { CRM_ERRORS } from './crm.js'

describe('security - error messages never leak internals', () => {
  it('no CRM message contains prisma, sql, stack, or path', () => {
    for (const [code, def] of Object.entries(CRM_ERRORS)) {
      const msg = def.message.toLowerCase()
      expect(msg, code).not.toContain('prisma')
      expect(msg, code).not.toContain('sql')
      expect(msg, code).not.toContain('stack')
      expect(msg, code).not.toContain('select')
      expect(msg, code).not.toContain('/app')
    }
  })

  it('toAppError strips all server-only fields', () => {
    for (const code of Object.keys(CRM_ERRORS) as Array<keyof typeof CRM_ERRORS>) {
      const server = getError(code)
      const client = toAppError(server)
      expect((client as unknown as Record<string, unknown>).httpStatus).toBeUndefined()
      expect((client as unknown as Record<string, unknown>).description).toBeUndefined()
      expect((client as unknown as Record<string, unknown>).param).toBeUndefined()
      expect(Object.keys(client).sort()).toEqual(['code', 'message'])
    }
  })

  it('isError guard rejects forged error lacking httpStatus number', () => {
    expect(isError({ code: 'crm/team-not-found', message: 'Team not found.' })).toBe(false)
    expect(isError({ code: 'crm/team-not-found', message: 'Team not found.', httpStatus: '404' as unknown as number })).toBe(false)
  })

  it('unknown codes fallback to generic internal without leaking input', () => {
    const err = getError('crm/../../etc/passwd')
    expect(err.code).toBe('crm/internal')
    expect(err.message).not.toContain('etc/passwd')
    expect(err.message).not.toContain('../../')
  })

  it('param injection does not override message', () => {
    const err = getError('crm/invalid-request', { param: '<script>alert(1)</script>' })
    expect(err.message).toBe(CRM_ERRORS['crm/invalid-request'].message)
    expect(err.param).toBe('<script>alert(1)</script>')
    expect((toAppError(err) as unknown as Record<string, unknown>).param).toBeUndefined
  })

  it('concurrent errors are isolated and not shared reference', async () => {
    const codes = ['crm/team-not-found', 'crm/category-not-found', 'crm/request-not-found'] as const
    const results = await Promise.all(codes.map(c => Promise.resolve(getError(c))))
    results[0].message = 'mutated'
    expect(results[1].message).not.toBe('mutated')
  })
})
