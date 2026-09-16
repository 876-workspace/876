/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  SenderListPanel,
  SenderListPanelSkeleton,
  type SenderListPanelState,
} from './sender-list-panel'
import type { EmailSender } from '@876/communications/contracts'

function sender(overrides: Partial<EmailSender> = {}): EmailSender {
  return {
    object: 'email_sender',
    id: 'snd_1',
    organizationId: 'org_1',
    domainId: null,
    name: 'Billing',
    email: 'billing@mail.87six.dev',
    replyTo: null,
    kind: 'managed',
    isDefault: true,
    isActive: true,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

function renderPanel(state: SenderListPanelState) {
  return render(<SenderListPanel state={state} baseHref="/settings/email" />)
}

describe('SenderListPanel', () => {
  it('renders a loading skeleton with an accessible label', () => {
    renderPanel({ status: 'loading' })
    expect(screen.getByLabelText('Loading senders')).toBeInTheDocument()
  })

  it('renders an empty state that is visibly different from an error', () => {
    renderPanel({ status: 'empty' })
    expect(screen.getByText('No senders yet.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an error without showing the empty copy', () => {
    renderPanel({
      status: 'error',
      error: { code: 'email/load-failed', message: 'Senders unavailable.' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Senders unavailable.')
    expect(screen.getByRole('alert')).toHaveTextContent('email/load-failed')
    expect(screen.queryByText('No senders yet.')).toBeNull()
  })

  it('renders a managed sender with a link built from baseHref', () => {
    renderPanel({ status: 'ready', data: [sender()] })
    const link = screen.getByRole('link', { name: 'Billing' })
    expect(link).toHaveAttribute('href', '/settings/email/senders/snd_1')
    expect(screen.getByText('billing@mail.87six.dev')).toBeInTheDocument()
    expect(screen.getByText('Managed')).toBeInTheDocument()
    expect(screen.getAllByText('Default')).toHaveLength(2)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders a custom-domain sender distinctly from a managed one', () => {
    renderPanel({
      status: 'ready',
      data: [
        sender({
          id: 'snd_2',
          name: 'Acme Billing',
          email: 'billing@acme.com',
          kind: 'custom-domain',
          domainId: 'dom_1',
          isDefault: false,
          isActive: false,
        }),
      ],
    })
    expect(screen.getByText('Custom domain')).toBeInTheDocument()
    expect(screen.queryByText('Managed')).toBeNull()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('never presents a managed sender as a verified domain', () => {
    renderPanel({ status: 'ready', data: [sender()] })
    expect(screen.getByText('Managed')).toBeInTheDocument()
    expect(screen.queryByText('Verified')).toBeNull()
    expect(screen.queryByText('Custom domain')).toBeNull()
  })

  it('renders the skeleton fallback with the same heading', () => {
    render(<SenderListPanelSkeleton />)
    expect(screen.getByText('Senders')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading senders')).toBeInTheDocument()
  })
})
