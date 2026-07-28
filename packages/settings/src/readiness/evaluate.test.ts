import { describe, expect, it } from 'vitest'

import { evaluateSetup } from './evaluate'
import type { SetupRequirement } from '../types'

const requirements: SetupRequirement[] = [
  {
    key: 'branding',
    label: 'Add branding',
    severity: 'optional',
    href: '/settings/branding',
  },
  {
    key: 'branch',
    label: 'Add a branch',
    severity: 'required',
    href: '/settings/branches',
  },
  {
    key: 'courier',
    label: 'Invite a courier',
    severity: 'recommended',
    href: '/settings/couriers',
    module: 'couriers',
  },
  {
    key: 'payment',
    label: 'Add payment',
    severity: 'required',
    href: '/settings/payment',
  },
]

describe('evaluateSetup', () => {
  it('sorts tasks and counts only unsatisfied required and recommended work', () => {
    expect(evaluateSetup(requirements, ['branch'])).toEqual({
      tasks: [
        { ...requirements[1]!, isSatisfied: true },
        { ...requirements[3]!, isSatisfied: false },
        { ...requirements[2]!, isSatisfied: false },
        { ...requirements[0]!, isSatisfied: false },
      ],
      outstandingRequired: 1,
      outstandingRecommended: 1,
      isReady: false,
      isComplete: false,
    })
  })

  it('ignores optional tasks for readiness and completion', () => {
    expect(
      evaluateSetup(requirements, ['branch', 'payment', 'courier'])
    ).toEqual({
      tasks: [
        { ...requirements[1]!, isSatisfied: true },
        { ...requirements[3]!, isSatisfied: true },
        { ...requirements[2]!, isSatisfied: true },
        { ...requirements[0]!, isSatisfied: false },
      ],
      outstandingRequired: 0,
      outstandingRecommended: 0,
      isReady: true,
      isComplete: true,
    })
  })

  it('is ready but incomplete when recommended work remains', () => {
    const result = evaluateSetup(requirements, ['branch', 'payment'])

    expect(result.outstandingRequired).toBe(0)
    expect(result.outstandingRecommended).toBe(1)
    expect(result.isReady).toBe(true)
    expect(result.isComplete).toBe(false)
  })
})
