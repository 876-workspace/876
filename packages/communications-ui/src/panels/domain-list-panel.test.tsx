/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  DomainListPanel,
  DomainListPanelSkeleton,
  type DomainListPanelState,
} from './domain-list-panel'
import type {
  EmailDomain,
  EmailDomainStatus,
} from '@876/communications/contracts'

function domain(
  id: string,
  name: string,
  status: EmailDomainStatus
): EmailDomain {
  return {
    object: 'email_domain',
    id,
    organizationId: 'org_1',
    provider: 'resend',
    name,
    region: null,
    status,
    records: [],
    verifiedAt: null,
    lastCheckedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  }
}

function renderPanel(state: DomainListPanelState) {
  return render(<DomainListPanel state={state} baseHref="/settings/email" />)
}

describe('DomainListPanel', () => {
  it('renders a loading skeleton with an accessible label', () => {
    renderPanel({ status: 'loading' })
    expect(screen.getByLabelText('Loading sending domains')).toBeInTheDocument()
  })

  it('renders an empty state that is visibly different from an error', () => {
    renderPanel({ status: 'empty' })
    expect(screen.getByText('No sending domains yet.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an error without showing the empty copy', () => {
    renderPanel({
      status: 'error',
      error: { code: 'email/load-failed', message: 'Domains unavailable.' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Domains unavailable.')
    expect(screen.queryByText('No sending domains yet.')).toBeNull()
  })

  it('renders every domain status with a distinct label', () => {
    renderPanel({
      status: 'ready',
      data: [
        domain('dom_1', 'a.example.com', 'not-started'),
        domain('dom_2', 'b.example.com', 'pending'),
        domain('dom_3', 'c.example.com', 'partially-verified'),
        domain('dom_4', 'd.example.com', 'partially-failed'),
        domain('dom_5', 'e.example.com', 'verified'),
        domain('dom_6', 'f.example.com', 'failed'),
      ],
    })
    expect(screen.getByText('Not started')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Partially verified')).toBeInTheDocument()
    expect(screen.getByText('Partially failed')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('keeps not-started and pending copy distinct: act versus wait', () => {
    renderPanel({
      status: 'ready',
      data: [
        domain('dom_1', 'a.example.com', 'not-started'),
        domain('dom_2', 'b.example.com', 'pending'),
      ],
    })
    expect(
      screen.getByText('Action needed — publish the DNS records.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Verification in progress — wait.')
    ).toBeInTheDocument()
  })

  it('builds domain links from baseHref', () => {
    renderPanel({
      status: 'ready',
      data: [domain('dom_9', 'mail.example.com', 'verified')],
    })
    expect(
      screen.getByRole('link', { name: 'mail.example.com' })
    ).toHaveAttribute('href', '/settings/email/domains/dom_9')
  })

  it('renders the skeleton fallback with the same heading', () => {
    render(<DomainListPanelSkeleton />)
    expect(screen.getByText('Sending domains')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading sending domains')).toBeInTheDocument()
  })
})
