import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { CustomerTimelinePanel } from './customer-timeline-panel'

const data = [{ id: 'evt_1', actor: 'Ada', verb: 'created', target: 'this customer', timestamp: '6 Sep 2026' }]
describe('CustomerTimelinePanel', () => {
  it('renders ready activity', () => { render(<CustomerTimelinePanel state={{ status: 'ready', data }} />); expect(screen.getByText('Ada')).toBeInTheDocument() })
  it('renders its empty state', () => { render(<CustomerTimelinePanel state={{ status: 'empty' }} />); expect(screen.getByText(/No activity/)).toBeInTheDocument() })
  it('renders its error state', () => { render(<CustomerTimelinePanel state={{ status: 'error', error: { code: 'x', message: 'Unavailable' } }} />); expect(screen.getByText('Unavailable')).toBeInTheDocument() })
  it('contains no hard-coded route href', () => { expect(readFileSync('src/panels/customer-timeline-panel.tsx', 'utf8')).not.toMatch(/href=|\/customers\//) })
})
