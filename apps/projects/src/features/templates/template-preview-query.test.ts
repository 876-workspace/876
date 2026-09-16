import { describe, expect, it } from 'vitest'

import { formatDateInput } from '@/lib/date-input'

import {
  FROM_TEMPLATE_PATH,
  parseTemplatePreviewQuery,
  templatePreviewHref,
} from './template-preview-query'

const INCLUDE_ALL = {
  includeWorkItems: true,
  includeDependencies: true,
  includeBudgets: true,
}

describe('templatePreviewHref', () => {
  it('builds a preview URL from the template, start, and flags', () => {
    const href = templatePreviewHref({
      templateId: 'tpl_1',
      start: '2026-09-01',
      include: INCLUDE_ALL,
    })

    expect(href.startsWith(`${FROM_TEMPLATE_PATH}?`)).toBe(true)
    const params = new URLSearchParams(href.split('?')[1])
    expect(params.get('templateId')).toBe('tpl_1')
    expect(params.get('start')).toBe('2026-09-01')
    expect(params.get('includeWorkItems')).toBe('true')
    expect(params.get('includeDependencies')).toBe('true')
    expect(params.get('includeBudgets')).toBe('true')
  })

  it('drops an unusable start date from the URL', () => {
    const href = templatePreviewHref({
      templateId: 'tpl_1',
      start: 'not-a-date',
      include: INCLUDE_ALL,
    })

    expect(new URLSearchParams(href.split('?')[1]).get('start')).toBeNull()
  })

  it('carries an excluded part of the template as false', () => {
    const href = templatePreviewHref({
      templateId: 'tpl_1',
      start: '2026-09-01',
      include: { ...INCLUDE_ALL, includeBudgets: false },
    })

    expect(new URLSearchParams(href.split('?')[1]).get('includeBudgets')).toBe(
      'false'
    )
  })
})

describe('parseTemplatePreviewQuery', () => {
  it('reads a preview request back off the URL', () => {
    const query = parseTemplatePreviewQuery({
      templateId: 'tpl_1',
      start: '2026-09-01',
      includeWorkItems: 'true',
      includeDependencies: 'false',
      includeBudgets: 'true',
    })

    expect(query).toEqual({
      templateId: 'tpl_1',
      startDate: Date.UTC(2026, 8, 1) / 1000,
      include: {
        includeWorkItems: true,
        includeDependencies: false,
        includeBudgets: true,
      },
    })
  })

  it('returns null when no template was chosen', () => {
    expect(parseTemplatePreviewQuery({ start: '2026-09-01' })).toBeNull()
    expect(parseTemplatePreviewQuery({ templateId: '  ', start: '2026-09-01' })).toBeNull()
  })

  it('returns null when the start date is missing or unusable', () => {
    expect(parseTemplatePreviewQuery({ templateId: 'tpl_1' })).toBeNull()
    expect(
      parseTemplatePreviewQuery({ templateId: 'tpl_1', start: 'yesterday' })
    ).toBeNull()
  })

  it('includes every part of the template unless the URL opts out', () => {
    const query = parseTemplatePreviewQuery({
      templateId: 'tpl_1',
      start: '2026-09-01',
    })

    expect(query?.include).toEqual(INCLUDE_ALL)
  })

  it('round-trips through the href builder', () => {
    const start = formatDateInput(Date.UTC(2026, 8, 1) / 1000)
    const href = templatePreviewHref({
      templateId: 'tpl_1',
      start,
      include: { ...INCLUDE_ALL, includeDependencies: false },
    })
    const params = new URLSearchParams(href.split('?')[1])

    expect(
      parseTemplatePreviewQuery({
        templateId: params.get('templateId') ?? undefined,
        start: params.get('start') ?? undefined,
        includeWorkItems: params.get('includeWorkItems') ?? undefined,
        includeDependencies: params.get('includeDependencies') ?? undefined,
        includeBudgets: params.get('includeBudgets') ?? undefined,
      })
    ).toEqual({
      templateId: 'tpl_1',
      startDate: Date.UTC(2026, 8, 1) / 1000,
      include: { ...INCLUDE_ALL, includeDependencies: false },
    })
  })
})
