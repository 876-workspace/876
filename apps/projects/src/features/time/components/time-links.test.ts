import { describe, expect, it } from 'vitest'

import {
  projectTimeHref,
  timePeriodHref,
  withEntryParam,
} from './time-links'

describe('projectTimeHref', () => {
  it('points at the project’s time tab', () => {
    expect(projectTimeHref('prj_1')).toBe('/projects/prj_1/time')
  })

  it('encodes an id that would otherwise break the path', () => {
    expect(projectTimeHref('prj/1')).toBe('/projects/prj%2F1/time')
  })
})

describe('timePeriodHref', () => {
  it('carries both bounds of the period', () => {
    expect(timePeriodHref({ from: 1704067200, to: 1704671999 })).toBe(
      '/time?from=1704067200&to=1704671999'
    )
  })
})

describe('withEntryParam', () => {
  it('opens with a question mark when the base has no query', () => {
    expect(withEntryParam('/projects/prj_1/time', 'new')).toBe(
      '/projects/prj_1/time?entry=new'
    )
  })

  it('extends a base that already carries the period', () => {
    expect(withEntryParam('/time?from=1&to=2', 'tme_1')).toBe(
      '/time?from=1&to=2&entry=tme_1'
    )
  })
})
