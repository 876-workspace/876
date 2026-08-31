/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  CollectionTabSkeleton,
  InvoicePreferenceTabSkeleton,
  ProvisioningResourceTypeSkeleton,
  WorkspaceTabSkeleton,
} from './provisioning-page-skeleton'

describe('Provisioning Page Skeletons', () => {
  it('renders WorkspaceTabSkeleton with setup details and workspace defaults', () => {
    render(<WorkspaceTabSkeleton />)

    expect(screen.getByText('Setup details')).toBeInTheDocument()
    expect(screen.getByText('Lifecycle')).toBeInTheDocument()
    expect(screen.getByText('Workspace defaults')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getAllByText('Country')).toHaveLength(2)
    expect(screen.getByText('Currency')).toBeInTheDocument()
    expect(screen.getByText('Base currency')).toBeInTheDocument()
    expect(screen.getByText('Default currency')).toBeInTheDocument()
    expect(screen.getByText('Default language')).toBeInTheDocument()
  })

  it('renders InvoicePreferenceTabSkeleton with singleton preference fields', () => {
    render(<InvoicePreferenceTabSkeleton />)

    expect(screen.getByText('Tax behavior')).toBeInTheDocument()
    expect(screen.getByText('Late fees enabled')).toBeInTheDocument()
    expect(screen.getByText('Late fee calculation')).toBeInTheDocument()
    expect(screen.getByText('Late fee percent')).toBeInTheDocument()
    expect(screen.getByText('Late fee amount')).toBeInTheDocument()
    expect(screen.getByText('Grace days')).toBeInTheDocument()
    expect(screen.getByText('Generate as draft')).toBeInTheDocument()
  })

  it('renders CollectionTabSkeleton for currency with exact column headers', () => {
    render(<CollectionTabSkeleton resourceType="currency" />)

    expect(screen.getByRole('columnheader', { name: 'ISO code', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Numeric code', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Minor unit', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Symbol', hidden: true })).toBeInTheDocument()
  })

  it('renders CollectionTabSkeleton for tax_rate with exact column headers', () => {
    render(<CollectionTabSkeleton resourceType="tax_rate" />)

    expect(screen.getByRole('columnheader', { name: 'Name', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Description', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tax type', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Rate', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Inclusive', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tax authority', hidden: true })).toBeInTheDocument()
  })

  it('dispatches the matching skeleton via ProvisioningResourceTypeSkeleton', () => {
    const { rerender } = render(
      <ProvisioningResourceTypeSkeleton resourceType="workspace" />
    )
    expect(screen.getByText('Setup details')).toBeInTheDocument()

    rerender(
      <ProvisioningResourceTypeSkeleton resourceType="invoice_preference" />
    )
    expect(screen.getByText('Tax behavior')).toBeInTheDocument()

    rerender(<ProvisioningResourceTypeSkeleton resourceType="payment_term" />)
    expect(screen.getByRole('columnheader', { name: 'Rule', hidden: true })).toBeInTheDocument()
  })
})
