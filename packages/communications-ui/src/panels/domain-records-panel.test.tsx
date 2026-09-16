/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  DomainRecordsPanel,
  DomainRecordsPanelSkeleton,
  type DomainRecordsPanelState,
} from './domain-records-panel'
import type { EmailDomainRecord } from '@876/communications/contracts'

function record(overrides: Partial<EmailDomainRecord> = {}): EmailDomainRecord {
  return {
    name: 'send',
    type: 'TXT',
    value: 'v=spf1 include:example.com ~all',
    purpose: 'SPF',
    ...overrides,
  }
}

function renderPanel(state: DomainRecordsPanelState) {
  return render(
    <DomainRecordsPanel
      state={state}
      domainName="acme.com"
      domainId="dom_1"
      baseHref="/settings/email"
    />
  )
}

describe('DomainRecordsPanel', () => {
  it('renders a loading skeleton with an accessible label', () => {
    renderPanel({ status: 'loading' })
    expect(
      screen.getByLabelText('Loading DNS records for acme.com')
    ).toBeInTheDocument()
  })

  it('renders an empty state that is visibly different from an error', () => {
    renderPanel({ status: 'empty' })
    expect(
      screen.getByText('No DNS records for this domain yet.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an error without showing the empty copy', () => {
    renderPanel({
      status: 'error',
      error: { code: 'email/load-failed', message: 'Records unavailable.' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Records unavailable.')
    expect(screen.queryByText('No DNS records for this domain yet.')).toBeNull()
  })

  it('groups records by purpose so shared names stay readable', () => {
    renderPanel({
      status: 'ready',
      data: [
        record({ purpose: 'SPF', type: 'TXT', value: 'v=spf1 a ~all' }),
        record({
          purpose: 'DKIM',
          name: 'resend._domainkey',
          type: 'TXT',
          value: 'p=abc123',
        }),
        record({
          purpose: 'DKIM',
          name: 'resend._domainkey',
          type: 'CNAME',
          value: 'api.example.com',
        }),
        record({ purpose: 'Tracking', type: 'CNAME', value: 't.example.com' }),
      ],
    })
    expect(screen.getByRole('heading', { name: 'SPF' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'DKIM' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Tracking' })
    ).toBeInTheDocument()
    expect(screen.getByText('v=spf1 a ~all')).toBeInTheDocument()
    expect(screen.getByText('p=abc123')).toBeInTheDocument()
  })

  it('gives every value a copy button with an accessible name', async () => {
    const user = userEvent.setup()
    renderPanel({
      status: 'ready',
      data: [record({ purpose: 'SPF', type: 'TXT' })],
    })
    const copy = screen.getByRole('button', {
      name: 'Copy SPF TXT record value',
    })
    expect(copy).toBeInTheDocument()
    await user.click(copy)
    expect(
      screen.getByRole('button', { name: 'Copy SPF TXT record value' })
    ).toBeInTheDocument()
  })

  it('groups records without a purpose under Other', () => {
    renderPanel({
      status: 'ready',
      data: [record({ purpose: undefined, value: 'orphan-value' })],
    })
    expect(screen.getByRole('heading', { name: 'Other' })).toBeInTheDocument()
    expect(screen.getByText('orphan-value')).toBeInTheDocument()
  })

  it('links the domain heading from baseHref', () => {
    renderPanel({ status: 'ready', data: [record()] })
    expect(screen.getByRole('link', { name: 'acme.com' })).toHaveAttribute(
      'href',
      '/settings/email/domains/dom_1'
    )
  })
})
