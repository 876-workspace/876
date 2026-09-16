/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendersList: vi.fn(),
  domainsList: vi.fn(),
  templatesList: vi.fn(),
}))

vi.mock('@/lib/services/communications', () => ({
  communicationsService: () => ({
    senders: { list: mocks.sendersList },
    domains: { list: mocks.domainsList },
    templates: { list: mocks.templatesList },
  }),
}))

import { DomainsData } from './domains-data'
import { DomainRecordsData } from './domain-records-data'
import { SendersData } from './senders-data'
import { TemplatesData } from './templates-data'

describe('Email panels data boundaries', () => {
  beforeEach(() => vi.resetAllMocks())

  it('renders a senders failure inline while keeping the panel frame', async () => {
    mocks.sendersList.mockResolvedValue({
      data: null,
      error: { code: 'email/unavailable', message: 'Senders unavailable.' },
    })

    render(
      await SendersData({ organizationId: 'org_1', baseHref: '/settings/email' })
    )

    expect(screen.getByText('Senders')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Senders unavailable.')
  })

  it('renders a domains failure inline while keeping the panel frame', async () => {
    mocks.domainsList.mockResolvedValue({
      data: null,
      error: { code: 'email/unavailable', message: 'Domains unavailable.' },
    })

    render(
      await DomainsData({
        organizationId: 'org_1',
        baseHref: '/settings/email',
        canManage: false,
      })
    )

    expect(screen.getByText('Sending domains')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Domains unavailable.')
  })

  it('renders a records failure inline without tearing down the page', async () => {
    mocks.domainsList.mockResolvedValue({
      data: null,
      error: { code: 'email/unavailable', message: 'Records unavailable.' },
    })

    render(
      await DomainRecordsData({
        organizationId: 'org_1',
        baseHref: '/settings/email',
      })
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Records unavailable.')
  })

  it('renders a templates failure inline while keeping the panel frame', async () => {
    mocks.templatesList.mockResolvedValue({
      data: null,
      error: { code: 'email/unavailable', message: 'Templates unavailable.' },
    })

    render(
      await TemplatesData({
        organizationId: 'org_1',
        baseHref: '/settings/email',
      })
    )

    expect(screen.getByText('Email templates')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Templates unavailable.'
    )
  })
})
