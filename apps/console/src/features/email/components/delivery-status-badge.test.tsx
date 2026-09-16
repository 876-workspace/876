/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { EmailDeliveryStatus } from '@876/communications/contracts'

import { DeliveryStatusBadge } from './delivery-status-badge'

const CASES: [EmailDeliveryStatus, string][] = [
  ['queued', 'Queued'],
  ['sent', 'Sent'],
  ['delivered', 'Delivered'],
  ['opened', 'Opened'],
  ['clicked', 'Clicked'],
  ['bounced', 'Bounced'],
  ['complained', 'Complained'],
  ['failed', 'Failed'],
]

describe('DeliveryStatusBadge', () => {
  it.each(CASES)('renders the %s status as its own badge', (status, label) => {
    render(<DeliveryStatusBadge status={status} />)

    const badge = screen.getByText(label)
    expect(badge).toBeInTheDocument()
    expect(badge.tagName).toBe('SPAN')
  })
})
