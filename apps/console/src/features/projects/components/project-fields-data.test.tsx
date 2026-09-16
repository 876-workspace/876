// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { listOf, makeProjectField } from '../test-fixtures'

const mocks = vi.hoisted(() => ({
  listFields: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/project-fields',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projectCustomFields: {
      list: mocks.listFields,
    },
  },
}))

import { ProjectFieldsData } from './project-fields-data'

afterEach(cleanup)

describe('ProjectFieldsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listFields.mockResolvedValue({
      data: listOf([
        makeProjectField(),
        makeProjectField({
          id: 'pcf_2',
          key: 'priority',
          label: 'Priority',
          fieldType: 'select',
          required: true,
        }),
      ]),
      error: null,
    })
  })

  it('fetches project fields for the organization', async () => {
    render(await ProjectFieldsData({ organizationId: 'org_1' }))

    expect(mocks.listFields).toHaveBeenCalledWith('org_1')
  })

  it('renders field labels with keys and types', async () => {
    render(await ProjectFieldsData({ organizationId: 'org_1' }))

    expect(screen.getAllByText('Team')).toHaveLength(2)
    expect(screen.getByText('team')).toBeInTheDocument()
    expect(screen.getByText('text')).toBeInTheDocument()
    expect(screen.getAllByText('Priority')).toHaveLength(2)
    expect(screen.getByText('select')).toBeInTheDocument()
  })

  it('marks required fields', async () => {
    render(await ProjectFieldsData({ organizationId: 'org_1' }))

    expect(document.querySelector('[data-slot="badge"]')).toHaveTextContent(
      'Required'
    )
  })

  it('shows the shared empty state when no project fields exist', async () => {
    mocks.listFields.mockResolvedValue({ data: listOf([]), error: null })

    render(await ProjectFieldsData({ organizationId: 'org_1' }))

    expect(screen.getAllByText('No project fields yet')).toHaveLength(2)
  })

  it('keeps the list shell and shows a banner when loading fails', async () => {
    mocks.listFields.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(await ProjectFieldsData({ organizationId: 'org_1' }))

    expect(
      screen.getByText('Project field data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getAllByText('No project fields yet')).toHaveLength(2)
  })
})
