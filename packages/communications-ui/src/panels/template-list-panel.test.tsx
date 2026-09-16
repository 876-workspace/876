/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  TemplateListPanel,
  TemplateListPanelSkeleton,
  type TemplateListPanelState,
} from './template-list-panel'
import type { EmailTemplate } from '@876/communications/contracts'

function template(overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    object: 'email_template',
    id: 'tpl_1',
    organizationId: null,
    key: 'billing.invoice',
    name: 'Invoice',
    category: 'billing',
    subject: 'Your invoice is ready',
    html: '<p>Hello</p>',
    text: null,
    senderId: null,
    isDefault: true,
    isSystem: true,
    isActive: true,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

function renderPanel(state: TemplateListPanelState) {
  return render(<TemplateListPanel state={state} baseHref="/settings/email" />)
}

describe('TemplateListPanel', () => {
  it('renders a loading skeleton with an accessible label', () => {
    renderPanel({ status: 'loading' })
    expect(screen.getByLabelText('Loading email templates')).toBeInTheDocument()
  })

  it('renders an empty state that is visibly different from an error', () => {
    renderPanel({ status: 'empty' })
    expect(screen.getByText('No email templates yet.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders an error without showing the empty copy', () => {
    renderPanel({
      status: 'error',
      error: { code: 'email/load-failed', message: 'Templates unavailable.' },
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Templates unavailable.'
    )
    expect(screen.queryByText('No email templates yet.')).toBeNull()
  })

  it('groups templates by category', () => {
    renderPanel({
      status: 'ready',
      data: [
        template({ id: 'tpl_1', name: 'Invoice', category: 'billing' }),
        template({
          id: 'tpl_2',
          name: 'Shipment',
          key: 'couriers.shipment',
          category: 'couriers',
          subject: 'Your shipment is on its way',
          isSystem: false,
          organizationId: 'org_1',
        }),
      ],
    })
    expect(screen.getByRole('heading', { name: 'billing' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'couriers' })
    ).toBeInTheDocument()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.getByText('Shipment')).toBeInTheDocument()
  })

  it('marks system templates distinctly from org-owned ones', () => {
    renderPanel({
      status: 'ready',
      data: [
        template({ id: 'tpl_1', isSystem: true }),
        template({
          id: 'tpl_2',
          name: 'Custom invoice',
          key: 'billing.invoice.custom',
          isSystem: false,
          organizationId: 'org_1',
        }),
      ],
    })
    expect(screen.getByText('System')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('builds template links from baseHref', () => {
    renderPanel({ status: 'ready', data: [template()] })
    expect(screen.getByRole('link', { name: 'Invoice' })).toHaveAttribute(
      'href',
      '/settings/email/templates/tpl_1'
    )
  })

  it('renders the skeleton fallback with the same heading', () => {
    render(<TemplateListPanelSkeleton />)
    expect(screen.getByText('Email templates')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading email templates')).toBeInTheDocument()
  })
})
