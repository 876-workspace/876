import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isAppHttpError } from '@/http/errors'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    modulePreference: {
      findMany: mocks.findMany,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}))

import {
  retrieveReportPreferences,
  updateReportPreferences,
} from '../report-preferences.repository'

async function validationError(
  promise: Promise<unknown>
): Promise<{ code: string; httpStatus: number }> {
  try {
    await promise
  } catch (error) {
    if (isAppHttpError(error))
      return { code: error.code, httpStatus: error.httpStatus }
    throw error
  }
  throw new Error('Expected a validation error.')
}

describe('report preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findMany.mockResolvedValue([])
  })

  it('resolves catalog defaults when no override rows exist', async () => {
    const result = await retrieveReportPreferences('ten_1')

    expect(result).toEqual({
      object: 'report_preferences',
      timezone: 'America/Jamaica',
      fiscalYearStartMonth: 1,
    })
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        module: 'reports',
        key: { in: ['timezone', 'fiscal-year-start-month'] },
      },
      select: { key: true, stringValue: true, integerValue: true },
    })
  })

  it('resolves stored overrides', async () => {
    mocks.findMany.mockResolvedValue([
      { key: 'timezone', stringValue: 'America/New_York', integerValue: null },
      { key: 'fiscal-year-start-month', stringValue: null, integerValue: 4 },
    ])

    const result = await retrieveReportPreferences('ten_1')

    expect(result).toEqual({
      object: 'report_preferences',
      timezone: 'America/New_York',
      fiscalYearStartMonth: 4,
    })
  })

  it('stores only non-default overrides with typed columns', async () => {
    await updateReportPreferences(
      'ten_1',
      { timezone: 'America/New_York', fiscalYearStartMonth: 4 },
      'user_1'
    )

    expect(mocks.upsert).toHaveBeenCalledTimes(2)
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: 'ten_1',
          module: 'reports',
          key: 'timezone',
          valueType: 'string',
          stringValue: 'America/New_York',
        }),
      })
    )
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: 'ten_1',
          module: 'reports',
          key: 'fiscal-year-start-month',
          valueType: 'integer',
          integerValue: 4,
        }),
      })
    )
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })

  it('removes the row when an override returns to the default', async () => {
    await updateReportPreferences(
      'ten_1',
      { timezone: 'America/Jamaica', fiscalYearStartMonth: 1 },
      'user_1'
    )

    expect(mocks.deleteMany).toHaveBeenCalledTimes(2)
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', module: 'reports', key: 'timezone' },
    })
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        module: 'reports',
        key: 'fiscal-year-start-month',
      },
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('rejects an unknown timezone with a 422 error', async () => {
    const error = await validationError(
      updateReportPreferences('ten_1', { timezone: 'Not/AZone' })
    )

    expect(error.code).toBe('validation/invalid-request')
    expect(error.httpStatus).toBe(422)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('rejects a fiscal month outside 1 through 12 with a 422 error', async () => {
    const error = await validationError(
      updateReportPreferences('ten_1', { fiscalYearStartMonth: 13 })
    )

    expect(error.code).toBe('validation/invalid-request')
    expect(error.httpStatus).toBe(422)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('degrades malformed persisted rows to the catalog defaults', async () => {
    mocks.findMany.mockResolvedValue([
      { key: 'timezone', stringValue: 'Broken/Zone', integerValue: null },
      { key: 'fiscal-year-start-month', stringValue: null, integerValue: 99 },
    ])

    const result = await retrieveReportPreferences('ten_1')

    expect(result).toEqual({
      object: 'report_preferences',
      timezone: 'America/Jamaica',
      fiscalYearStartMonth: 1,
    })
  })
})
