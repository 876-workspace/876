// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  listOf,
  makeCustomModule,
  makeCustomModuleField,
  makeCustomModuleStatus,
  makeCustomRecord,
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveModule: vi.fn(),
  listRecords: vi.fn(),
  listStatuses: vi.fn(),
  listFields: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/custom-modules/cmod_1/records',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    customModules: {
      retrieveModule: mocks.retrieveModule,
      listRecords: mocks.listRecords,
      listStatuses: mocks.listStatuses,
      listFields: mocks.listFields,
    },
  },
}))

import { CustomModuleRecordsData } from './custom-module-records-data'

function renderRecords(moduleId = 'cmod_1', base = '/projects') {
  return CustomModuleRecordsData({
    organizationId: 'org_1',
    base,
    moduleId,
  })
}

afterEach(cleanup)

describe('CustomModuleRecordsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveModule.mockResolvedValue({
      data: makeCustomModule(),
      error: null,
    })
    mocks.listRecords.mockResolvedValue({
      data: listOf([makeCustomRecord()]),
      error: null,
    })
    mocks.listStatuses.mockResolvedValue({
      data: listOf([makeCustomModuleStatus()]),
      error: null,
    })
    mocks.listFields.mockResolvedValue({
      data: listOf([makeCustomModuleField()]),
      error: null,
    })
  })

  it('retrieves the decoded module before listing records', async () => {
    render(await renderRecords('cmod%201'))

    expect(mocks.retrieveModule).toHaveBeenCalledWith('org_1', 'cmod 1')
    expect(mocks.listRecords).toHaveBeenCalledWith('org_1', 'cmod_1', {
      limit: 100,
    })
  })

  it('renders record titles with status labels and field columns', async () => {
    render(await renderRecords())

    expect(screen.getAllByText('Vendor delay').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0)
    expect(
      within(screen.getByRole('table')).getByText('Severity')
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('table')).getByText('high')
    ).toBeInTheDocument()
  })

  it('links each record under the host records root', async () => {
    render(await renderRecords('cmod_1', '/workspace/acme/projects'))

    expect(
      within(screen.getByRole('table')).getByRole('link', {
        name: 'Vendor delay',
      })
    ).toHaveAttribute(
      'href',
      '/workspace/acme/projects/custom-modules/cmod_1/records/cmodr_1'
    )
  })

  it('notFound when the module does not exist', async () => {
    mocks.retrieveModule.mockResolvedValue({
      data: null,
      error: { code: 'projects/custom-module-not-found', message: 'missing' },
    })

    render(await renderRecords())

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('surfaces a banner when records cannot be loaded', async () => {
    mocks.listRecords.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await renderRecords())

    expect(
      screen.getByText('Custom module records could not be loaded')
    ).toBeInTheDocument()
  })
})
