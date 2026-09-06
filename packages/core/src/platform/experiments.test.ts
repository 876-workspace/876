import { describe, expect, it } from 'vitest'

import { resolveExperimentDecision } from './experiments'

describe('resolveExperimentDecision', () => {
  it('resolves a null decision list to disabled control by contract', () => {
    expect(resolveExperimentDecision('platform-test', null)).toEqual({
      key: 'platform-test',
      enabled: false,
      variant: null,
      payload: null,
      isControl: true,
    })
  })

  it('resolves a missing slug to disabled control', () => {
    expect(
      resolveExperimentDecision('platform-test', [
        { feature: { slug: 'other' }, enabled: true },
      ])
    ).toEqual({
      key: 'platform-test',
      enabled: false,
      variant: null,
      payload: null,
      isControl: true,
    })
  })

  it('preserves an enabled variant and payload', () => {
    expect(
      resolveExperimentDecision<{ color: string }>('platform-test', [
        {
          feature: { slug: 'platform-test' },
          enabled: true,
          variant: 'treatment',
          payload: { color: 'blue' },
        },
      ])
    ).toEqual({
      key: 'platform-test',
      enabled: true,
      variant: 'treatment',
      payload: { color: 'blue' },
      isControl: false,
    })
  })

  it('clears stale variant and payload from a disabled feature', () => {
    expect(
      resolveExperimentDecision('platform-test', [
        {
          feature: { slug: 'platform-test' },
          enabled: false,
          variant: 'treatment',
          payload: { color: 'blue' },
        },
      ])
    ).toEqual({
      key: 'platform-test',
      enabled: false,
      variant: null,
      payload: null,
      isControl: true,
    })
  })
})
