import { describe, expect, it } from 'vitest'

import type { PackageStatus } from '@/types/package'
import type { PortalTimelineStep } from '@/types/portal'

import { getPackageStatusLabel, getPackageTimeline } from './package-status'

const STANDARD_STATUS_CASES = [
  ['PRE_ALERT', 'Pre-alert'],
  ['RECEIVED', 'Received'],
  ['IN_TRANSIT', 'In transit'],
  ['ARRIVED', 'Arrived'],
  ['READY_FOR_PICKUP', 'Ready for pickup'],
  ['COLLECTED', 'Collected'],
] as const satisfies readonly (readonly [
  Exclude<PackageStatus, 'UNCLAIMED'>,
  string,
])[]

const STATUS_CASES = [
  ...STANDARD_STATUS_CASES,
  ['UNCLAIMED', 'Unclaimed'],
] as const satisfies readonly (readonly [PackageStatus, string])[]

const STANDARD_STATUSES = STANDARD_STATUS_CASES.map(([status]) => status)

function createExpectedTimeline(
  currentStatus: Exclude<PackageStatus, 'UNCLAIMED'>
): PortalTimelineStep[] {
  const currentIndex = STANDARD_STATUSES.indexOf(currentStatus)

  return STANDARD_STATUS_CASES.map(([status, label], index) => ({
    status,
    label,
    state:
      index < currentIndex
        ? 'reached'
        : index === currentIndex
          ? 'current'
          : 'pending',
  }))
}

describe('getPackageStatusLabel', () => {
  it.each(STATUS_CASES)('returns the exact label for %s', (status, label) => {
    const result = getPackageStatusLabel(status)

    expect(result).toBe(label)
  })
})

describe('getPackageTimeline', () => {
  it.each(STANDARD_STATUS_CASES)(
    'marks every step relative to %s',
    (status) => {
      const result = getPackageTimeline(status)

      expect(result).toEqual(createExpectedTimeline(status))
    }
  )

  it('replaces collected with a terminal unclaimed step', () => {
    const result = getPackageTimeline('UNCLAIMED')

    expect(result).toEqual([
      { status: 'PRE_ALERT', label: 'Pre-alert', state: 'reached' },
      { status: 'RECEIVED', label: 'Received', state: 'reached' },
      { status: 'IN_TRANSIT', label: 'In transit', state: 'reached' },
      { status: 'ARRIVED', label: 'Arrived', state: 'reached' },
      {
        status: 'READY_FOR_PICKUP',
        label: 'Ready for pickup',
        state: 'reached',
      },
      { status: 'UNCLAIMED', label: 'Unclaimed', state: 'current' },
    ])
  })
})
