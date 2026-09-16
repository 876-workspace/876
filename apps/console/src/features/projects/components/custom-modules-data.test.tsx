// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeCustomModule } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listModules: vi.fn(),
  listFields: vi.fn(),
  listRecords: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/custom-modules',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    customModules: {
      listModules: mocks.listModules,
      listFields: mocks.listFields,
      listRecords: mocks.listRecords,
    },
  },
}))

import { CustomModulesData } from './custom-modules-data'

afterEach(cleanup)

describe('CustomModulesData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listModules.mockResolvedValue({
      data: listOf([makeCustomModule()]),
      error: null,
    })
    mocks.listFields.mockResolvedValue({
      data: listOf([]),
      error: null,
    })
    mocks.listRecords.mockResolvedValue({
      data: { ...listOf([]), total_count: 4 },
      error: null,
    })
  })

  it('fetches custom modules for the host organization', async () => {
    render(
      await CustomModulesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listModules).toHaveBeenCalledWith('org_1')
  })

  it('resolves field and record counts per module', async () => {
    render(
      await CustomModulesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listFields).toHaveBeenCalledWith('org_1', 'cmod_1')
    expect(mocks.listRecords).toHaveBeenCalledWith('org_1', 'cmod_1', {
      limit: 1,
    })
  })

  it('renders module names with scope and counts', async () => {
    render(
      await CustomModulesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(screen.getAllByText('Risks').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Organization').length).toBeGreaterThan(0)
    expect(screen.getAllByText('4 records').length).toBeGreaterThan(0)
  })

  it('links each row under the host custom-modules root', async () => {
    render(
      await CustomModulesData({
        organizationId: 'org_1',
        base: '/workspace/acme/projects',
      })
    )

    expect(
      screen.getByRole('link', { name: 'Risks' })
    ).toHaveAttribute('href', '/workspace/acme/projects/custom-modules/cmod_1')
  })

  it('surfaces a banner when modules cannot be loaded', async () => {
    mocks.listModules.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await CustomModulesData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Custom module data could not be loaded')
    ).toBeInTheDocument()
    expect(
      screen.getAllByText('No custom modules yet').length
    ).toBeGreaterThan(0)
  })
})
