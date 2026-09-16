// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { RecordSummary } from './record-summary'
import type { CustomModuleRecord, CustomModuleStatus } from './types'

const STATUSES: CustomModuleStatus[] = [
  { key: 'backlog', label: 'Backlog', category: 'open', position: 0 },
  { key: 'doing', label: 'Doing', category: 'in-progress', position: 1 },
]

function makeRecord(): CustomModuleRecord {
  return {
    object: 'projects.custom-module-record',
    id: 'rec_1',
    moduleId: 'mod_1',
    projectId: 'proj_1',
    title: 'Fix login',
    statusKey: 'doing',
    values: { severity: 'high', estimate: 3, verified: true, notes: null },
    createdAt: Date.UTC(2026, 2, 3) / 1000,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
  }
}

const FIELDS = [
  { fieldKey: 'severity', label: 'Severity' },
  { fieldKey: 'estimate', label: 'Estimate' },
]

describe('RecordSummary', () => {
  afterEach(cleanup)

  it('renders the record title', () => {
    render(<RecordSummary record={makeRecord()} />)

    expect(screen.getByText('Fix login')).toBeInTheDocument()
  })

  it('renders the resolved status label', () => {
    render(<RecordSummary record={makeRecord()} statuses={STATUSES} />)

    expect(screen.getByText('Doing')).toBeInTheDocument()
  })

  it('renders each field label and value', () => {
    render(<RecordSummary record={makeRecord()} fields={FIELDS} />)

    expect(screen.getByText('Severity')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders an em dash for an empty value', () => {
    render(
      <RecordSummary
        record={makeRecord()}
        fields={[{ fieldKey: 'notes', label: 'Notes' }]}
      />
    )

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders booleans as Yes', () => {
    render(
      <RecordSummary
        record={makeRecord()}
        fields={[{ fieldKey: 'verified', label: 'Verified' }]}
      />
    )

    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('omits the field grid with no fields', () => {
    const { container } = render(<RecordSummary record={makeRecord()} />)

    expect(container.querySelector('dl')).toBeNull()
  })
})
