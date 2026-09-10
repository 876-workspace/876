import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ order: [] as string[] }))

vi.mock('./app-access', () => ({
  seedAppAccess: vi.fn(async () => ({})),
}))
vi.mock('./bootstrap', () => ({
  seedBootstrap: vi.fn(async () => ({})),
}))
vi.mock('./default-prices', () => ({
  seedDefaultAppPrices: vi.fn(async () => {
    state.order.push('defaultPrices')
    return {}
  }),
}))
vi.mock('./features', () => ({
  seedAllFeatures: vi.fn(async () => ({})),
}))
vi.mock('./geo', () => ({
  seedGeoCatalog: vi.fn(async () => ({})),
}))
vi.mock('./internal-plan', () => ({
  seedInternalPlans: vi.fn(async () => {
    state.order.push('internalPlan')
    return {}
  }),
}))
vi.mock('./plans', () => ({
  seedPlans: vi.fn(async () => {
    state.order.push('plans')
    return {}
  }),
}))
vi.mock('@/platform/logger', () => ({
  getLogger: vi.fn(() => ({ info: vi.fn() })),
}))

import { runSeeds } from './index'

describe('runSeeds plan dependency order', () => {
  it('creates default products before module grants and internal plans', async () => {
    // ARRANGE
    state.order.length = 0

    // ACT
    await runSeeds({ only: ['defaultPrices', 'plans', 'internalPlan'] })

    // ASSERT
    expect(state.order).toEqual(['defaultPrices', 'plans', 'internalPlan'])
  })
})
