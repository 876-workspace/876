/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import type { AdminAccount } from '@876/admin'
import { KeyRound } from '@876/ui/icons'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  CountPill,
  EmptyHint,
  Fact,
  FactGrid,
  IconChip,
  ProviderRow,
  StatusBadge,
} from './overview-ui'

const account: AdminAccount = {
  object: 'account',
  id: 'acct_1',
  provider_id: 'google',
  provider_type: 'oauth',
  created_at: 1700000000,
  updated_at: 1700000000,
}

describe('overview UI primitives', () => {
  it('renders facts, icons, empty hints, and positive count pills', () => {
    const { container } = render(
      <>
        <IconChip icon={KeyRound} tone="amber" />
        <CountPill count={3} />
        <FactGrid>
          <Fact label="Email" value="ada@example.com" mono />
        </FactGrid>
        <EmptyHint>No saved data.</EmptyHint>
        <StatusBadge status="active" />
      </>
    )

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toHaveClass('font-mono')
    expect(screen.getByText('No saved data.')).toBeInTheDocument()
    expect(screen.getByText('active')).toHaveClass('text-emerald-700')
    expect(container.querySelector('dl')).toBeInTheDocument()
  })

  it('omits zero count pills', () => {
    const { container } = render(<CountPill count={0} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('labels known, credential, and custom providers', () => {
    render(
      <ul>
        <ProviderRow account={account} />
        <ProviderRow
          account={{
            ...account,
            id: 'acct_2',
            provider_id: 'email-password',
            provider_type: 'credential',
          }}
        />
        <ProviderRow
          account={{
            ...account,
            id: 'acct_3',
            provider_id: 'custom-sso',
            provider_type: 'oauth',
          }}
        />
      </ul>
    )

    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Email & password')).toBeInTheDocument()
    expect(screen.getByText('custom-sso')).toBeInTheDocument()
  })
})
