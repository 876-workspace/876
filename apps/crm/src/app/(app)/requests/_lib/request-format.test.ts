import {
  formatDueDate,
  fromDateTimeLocal,
  isOverdue,
  toDateTimeLocal,
} from './request-format'

/** 2026-09-01T09:30 in the runner's own zone, as Unix seconds. */
const SEPT_1_0930 = Math.floor(new Date('2026-09-01T09:30:00').getTime() / 1000)
const SEPT_1_MIDNIGHT = Math.floor(
  new Date('2026-09-01T00:00:00').getTime() / 1000
)

describe('formatDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-27T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('drops the year for a date in the current year', () => {
    expect(formatDueDate(SEPT_1_0930)).toBe('Sep 1, 9:30 AM')
  })

  it('keeps the year for a date in another year', () => {
    const nextYear = Math.floor(
      new Date('2027-09-01T09:30:00').getTime() / 1000
    )

    expect(formatDueDate(nextYear)).toBe('Sep 1, 2027, 9:30 AM')
  })

  it('omits the time for a date set to midnight, which carries no time', () => {
    expect(formatDueDate(SEPT_1_MIDNIGHT)).toBe('Sep 1')
  })
})

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-27T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is false for a future moment', () => {
    expect(isOverdue(SEPT_1_0930)).toBe(false)
  })

  it('is true for a past moment', () => {
    expect(isOverdue(SEPT_1_0930 - 30 * 24 * 60 * 60)).toBe(true)
  })
})

describe('toDateTimeLocal', () => {
  it('renders the viewer’s local wall-clock time, not UTC', () => {
    expect(toDateTimeLocal(SEPT_1_0930)).toBe('2026-09-01T09:30')
  })

  it('zero-pads every component', () => {
    const earlyJan = Math.floor(
      new Date('2026-01-05T04:07:00').getTime() / 1000
    )

    expect(toDateTimeLocal(earlyJan)).toBe('2026-01-05T04:07')
  })
})

describe('fromDateTimeLocal', () => {
  it('round-trips a value produced by toDateTimeLocal', () => {
    expect(fromDateTimeLocal(toDateTimeLocal(SEPT_1_0930))).toBe(SEPT_1_0930)
  })

  it('returns null for an empty field', () => {
    expect(fromDateTimeLocal('')).toBeNull()
  })

  it('returns null for a value the browser could not parse', () => {
    expect(fromDateTimeLocal('tomorrow-ish')).toBeNull()
  })
})
