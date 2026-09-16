// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ImportJobList } from './import-job-list'
import type { ImportJob } from './types'

function makeJob(overrides?: Partial<ImportJob>): ImportJob {
  return {
    object: 'projects.import-job',
    id: 'imp_1',
    source: 'jira-csv',
    status: 'completed',
    rowCount: 120,
    errorCount: 3,
    importedCount: 117,
    createdAt: Date.UTC(2026, 2, 4) / 1000,
    ...overrides,
  }
}

describe('ImportJobList', () => {
  afterEach(cleanup)

  it('renders the source label', () => {
    render(<ImportJobList jobs={[makeJob()]} />)
    expect(screen.getByText('Jira CSV')).toBeInTheDocument()
  })

  it('badges the job status', () => {
    render(<ImportJobList jobs={[makeJob({ status: 'failed' })]} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders row, error, and imported counts', () => {
    render(<ImportJobList jobs={[makeJob()]} />)
    expect(screen.getByText(/120 rows/)).toBeInTheDocument()
    expect(screen.getByText(/3 errors/)).toBeInTheDocument()
    expect(screen.getByText(/117 imported/)).toBeInTheDocument()
  })

  it('renders the created day', () => {
    render(<ImportJobList jobs={[makeJob()]} />)
    expect(screen.getByText(/Mar 4, 2026/)).toBeInTheDocument()
  })

  it('labels every import source', () => {
    render(
      <ImportJobList
        jobs={[
          makeJob({ id: 'a', source: 'csv' }),
          makeJob({ id: 'b', source: 'trello-json' }),
          makeJob({ id: 'c', source: 'asana-csv' }),
        ]}
      />
    )
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('Trello JSON')).toBeInTheDocument()
    expect(screen.getByText('Asana CSV')).toBeInTheDocument()
  })

  it('renders the empty state', () => {
    render(<ImportJobList jobs={[]} />)
    expect(screen.getByText('No import jobs yet')).toBeInTheDocument()
  })
})
