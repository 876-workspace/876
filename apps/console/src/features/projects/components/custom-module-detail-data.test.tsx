// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeCustomModule,
  makeCustomModuleField,
  makeCustomModuleStatus,
  makeCustomRecord,
  makeLayout,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveModule: vi.fn(),
  listFields: vi.fn(),
  listStatuses: vi.fn(),
  listLayouts: vi.fn(),
  listRecords: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/custom-modules/cmod_1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    customModules: {
      retrieveModule: mocks.retrieveModule,
      listFields: mocks.listFields,
      listStatuses: mocks.listStatuses,
      listRecords: mocks.listRecords,
    },
    layouts: {
      list: mocks.listLayouts,
    },
  },
}))

import { CustomModuleDetailData } from './custom-module-detail-data'

function renderDetail(moduleId = 'cmod_1', base = '/projects') {
  return CustomModuleDetailData({
    organizationId: 'org_1',
    base,
    moduleId,
  })
}

afterEach(cleanup)

describe('CustomModuleDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveModule.mockResolvedValue({
      data: makeCustomModule(),
      error: null,
    })
    mocks.listFields.mockResolvedValue({
      data: listOf([makeCustomModuleField()]),
      error: null,
    })
    mocks.listStatuses.mockResolvedValue({
      data: listOf([makeCustomModuleStatus()]),
      error: null,
    })
    mocks.listLayouts.mockResolvedValue({
      data: listOf([
        makeLayout({
          id: 'lay_mod',
          entity: 'custom-module:risk-log',
          name: 'Risk default',
        }),
      ]),
      error: null,
    })
    mocks.listRecords.mockResolvedValue({
      data: { ...listOf([makeCustomRecord()]), total_count: 1 },
      error: null,
    })
  })

  it('retrieves the decoded module for the host organization', async () => {
    render(await renderDetail('cmod%201'))

    expect(mocks.retrieveModule).toHaveBeenCalledWith('org_1', 'cmod 1')
  })

  it('resolves fields, statuses, layout, and records for the module', async () => {
    render(await renderDetail())

    expect(mocks.listFields).toHaveBeenCalledWith('org_1', 'cmod_1')
    expect(mocks.listStatuses).toHaveBeenCalledWith('org_1', 'cmod_1')
    expect(mocks.listLayouts).toHaveBeenCalledWith('org_1', {
      entity: 'custom-module:risk-log',
    })
    expect(mocks.listRecords).toHaveBeenCalledWith('org_1', 'cmod_1', {
      limit: 1,
    })
  })

  it('renders the module identity with scope and record count', async () => {
    render(await renderDetail())

    expect(screen.getByText('Risks')).toBeInTheDocument()
    expect(screen.getByText('risk-log')).toBeInTheDocument()
    expect(screen.getAllByText('Organization').length).toBe(2)
    expect(screen.getByText('1 record')).toBeInTheDocument()
  })

  it('renders fields, statuses, and the layout summary', async () => {
    render(await renderDetail())

    expect(screen.getByText('Severity')).toBeInTheDocument()
    expect(screen.getByText('severity')).toBeInTheDocument()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByText('Risk default')).toBeInTheDocument()
    expect(screen.getByText('Basics')).toBeInTheDocument()
  })

  it('renders restricted role keys as access badges', async () => {
    mocks.retrieveModule.mockResolvedValue({
      data: makeCustomModule({ restrictedToRoleKeys: ['staff'] }),
      error: null,
    })

    render(await renderDetail())

    expect(screen.getByText('staff')).toBeInTheDocument()
  })

  it('notFound when the module does not exist', async () => {
    mocks.retrieveModule.mockResolvedValue({
      data: null,
      error: { code: 'projects/custom-module-not-found', message: 'missing' },
    })

    render(await renderDetail())

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('links to records and back under the host root', async () => {
    render(await renderDetail('cmod_1', '/workspace/acme/projects'))

    expect(screen.getByRole('link', { name: 'View records' })).toHaveAttribute(
      'href',
      '/workspace/acme/projects/custom-modules/cmod_1/records'
    )
    expect(
      screen.getByRole('link', { name: 'Back to custom modules' })
    ).toHaveAttribute('href', '/workspace/acme/projects/custom-modules')
  })
})
