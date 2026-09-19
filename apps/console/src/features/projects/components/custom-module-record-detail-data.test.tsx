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
} from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  retrieveModule: vi.fn(),
  retrieveRecord: vi.fn(),
  listStatuses: vi.fn(),
  listFields: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  usePathname: () => '/projects/custom-modules/cmod_1/records/cmodr_1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    customModules: {
      retrieveModule: mocks.retrieveModule,
      retrieveRecord: mocks.retrieveRecord,
      listStatuses: mocks.listStatuses,
      listFields: mocks.listFields,
    },
  },
}))

import { CustomModuleRecordDetailData } from './custom-module-record-detail-data'

function renderRecord(
  moduleId = 'cmod_1',
  recordId = 'cmodr_1',
  base = '/projects'
) {
  return CustomModuleRecordDetailData({
    organizationId: 'org_1',
    base,
    moduleId,
    recordId,
  })
}

afterEach(cleanup)

describe('CustomModuleRecordDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveModule.mockResolvedValue({
      data: makeCustomModule(),
      error: null,
    })
    mocks.retrieveRecord.mockResolvedValue({
      data: makeCustomRecord(),
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

  it('retrieves the decoded module and record for the host organization', async () => {
    render(await renderRecord('cmod%201', 'cmodr%201'))

    expect(mocks.retrieveModule).toHaveBeenCalledWith('org_1', 'cmod 1')
    expect(mocks.retrieveRecord).toHaveBeenCalledWith(
      'org_1',
      'cmod_1',
      'cmodr 1'
    )
  })

  it('renders the record summary with field labels and values', async () => {
    render(await renderRecord())

    expect(screen.getAllByText('Vendor delay').length).toBeGreaterThan(0)
    expect(screen.getByText('Severity')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0)
  })

  it('notFound when the record does not exist', async () => {
    mocks.retrieveRecord.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/custom-module-record-not-found',
        message: 'missing',
      },
    })

    render(await renderRecord())

    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('surfaces a banner when the record cannot be loaded', async () => {
    mocks.retrieveRecord.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await renderRecord())

    expect(
      screen.getByText('Custom module record could not be loaded')
    ).toBeInTheDocument()
  })

  it('links back to records and the module under the host root', async () => {
    render(await renderRecord('cmod_1', 'cmodr_1', '/workspace/acme/projects'))

    expect(screen.getByRole('link', { name: 'Back to records' })).toHaveAttribute(
      'href',
      '/workspace/acme/projects/custom-modules/cmod_1/records'
    )
    expect(screen.getByRole('link', { name: 'Back to Risks' })).toHaveAttribute(
      'href',
      '/workspace/acme/projects/custom-modules/cmod_1'
    )
  })
})
