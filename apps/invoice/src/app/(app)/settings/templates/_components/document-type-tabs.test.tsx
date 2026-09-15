/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  DocumentTypeTabs,
  resolveDocumentTypeParam,
} from './document-type-tabs'

describe('resolveDocumentTypeParam', () => {
  it('keeps a known document type', () => {
    expect(resolveDocumentTypeParam('quote')).toBe('quote')
    expect(resolveDocumentTypeParam('credit-note')).toBe('credit-note')
  })

  it('falls back to invoice for an unknown type', () => {
    expect(resolveDocumentTypeParam('banana')).toBe('invoice')
  })

  it('falls back to invoice when the param is missing', () => {
    expect(resolveDocumentTypeParam(undefined)).toBe('invoice')
  })

  it('falls back to invoice for a repeated param', () => {
    expect(resolveDocumentTypeParam(['invoice', 'quote'])).toBe('invoice')
  })
})

describe('DocumentTypeTabs', () => {
  it('links every document type and marks the active one', () => {
    render(<DocumentTypeTabs active="quote" />)

    const tabs = screen.getAllByRole('link')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Invoice',
      'Quote',
      'Sales Receipt',
      'Credit Note',
      'Payment Receipt',
    ])
    expect(tabs.map((tab) => tab.getAttribute('href'))).toEqual([
      '/settings/templates?type=invoice',
      '/settings/templates?type=quote',
      '/settings/templates?type=sales-receipt',
      '/settings/templates?type=credit-note',
      '/settings/templates?type=payment-receipt',
    ])
    expect(
      screen.getByRole('link', { name: 'Quote' }).getAttribute('aria-current')
    ).toBe('page')
    expect(
      screen.getByRole('link', { name: 'Invoice' }).getAttribute('aria-current')
    ).toBeNull()
  })
})
