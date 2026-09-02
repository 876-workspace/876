import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardRouteTabs,
  DetailCardSection,
} from './detail-card'

const mocks = vi.hoisted(() => ({ pathname: '/customers/cus_2kL9mN4q' }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

describe('DetailCardHeader', () => {
  it('calls onClose when the close button is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <DetailCardHeader
        title="Alejandra Reyes"
        onClose={onClose}
        closeLabel="Close customer details"
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Close customer details' })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders closeHref as a link so a server layout needs no client boundary', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <DetailCardHeader
        title="Alejandra Reyes"
        closeHref="/customers"
        closeLabel="Close customer details"
      />
    )

    expect(
      screen.getByRole('link', { name: 'Close customer details' })
    ).toHaveAttribute('href', '/customers')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('prefers onClose over closeHref when both are given', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <DetailCardHeader
        title="Alejandra Reyes"
        onClose={onClose}
        closeHref="/customers"
        closeLabel="Close customer details"
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Close customer details' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders no action area at all when there is nothing to put in it', () => {
    render(<DetailCardHeader title="Alejandra Reyes" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('DetailCardMetaItem', () => {
  it('links the value when href is given and renders plain text otherwise', () => {
    render(
      <DetailCardMeta>
        <DetailCardMetaItem href="mailto:alejandra@example.com">
          alejandra@example.com
        </DetailCardMetaItem>
        <DetailCardMetaItem>Business</DetailCardMetaItem>
      </DetailCardMeta>
    )

    expect(
      screen.getByRole('link', { name: 'alejandra@example.com' })
    ).toHaveAttribute('href', 'mailto:alejandra@example.com')
    expect(screen.getByText('Business').tagName).toBe('SPAN')
  })
})

describe('DetailCardRouteTabs', () => {
  const tabs = [
    { label: 'Overview', href: '/customers/cus_2kL9mN4q', exact: true },
    { label: 'Contacts', href: '/customers/cus_2kL9mN4q/contacts' },
  ]

  it('marks the index tab current on the record route', () => {
    mocks.pathname = '/customers/cus_2kL9mN4q'
    render(<DetailCardRouteTabs tabs={tabs} />)

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Contacts' })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('marks the nested tab current on its own route', () => {
    mocks.pathname = '/customers/cus_2kL9mN4q/contacts'
    render(<DetailCardRouteTabs tabs={tabs} />)

    expect(screen.getByRole('link', { name: 'Contacts' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    // `exact` keeps the index tab from matching every nested route.
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
      'aria-current'
    )
  })
})

describe('DetailCardBody', () => {
  it('does not contain the overscroll-containment that traps the page scroll', () => {
    // Regression: `overscroll-contain` on an in-page pane stops the wheel from
    // reaching the page, and in Chrome it does so even when the pane has
    // nothing to scroll — the screen freezes under the cursor.
    render(
      <DetailCard>
        <DetailCardBody data-testid="body" />
      </DetailCard>
    )

    expect(screen.getByTestId('body').className).not.toContain('overscroll')
  })
})

describe('DetailCardSection', () => {
  it('renders its title as a heading above the content', () => {
    render(
      <DetailCardSection title="Billing">
        <p>content</p>
      </DetailCardSection>
    )

    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('omits the heading entirely when no title is given', () => {
    render(
      <DetailCardSection>
        <p>content</p>
      </DetailCardSection>
    )

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})

describe('DetailCardFact', () => {
  it('pairs each label with its value as a definition list', () => {
    render(
      <DetailCardFacts>
        <DetailCardFact label="Currency" value="JMD" mono />
        <DetailCardFact label="Unit" value="hour" />
      </DetailCardFacts>
    )

    expect(screen.getByText('Currency').tagName).toBe('DT')
    expect(screen.getByText('JMD').tagName).toBe('DD')
    expect(screen.getByText('JMD').className).toContain('font-mono')
    expect(screen.getByText('hour').className).not.toContain('font-mono')
  })
})

describe('DetailCardHeadline', () => {
  it('renders the value, and the caption only when given', () => {
    const { rerender } = render(<DetailCardHeadline value="$7,500.00" />)

    expect(screen.getByText('$7,500.00')).toBeInTheDocument()
    expect(screen.queryByText(/Default selling price/)).not.toBeInTheDocument()

    rerender(
      <DetailCardHeadline
        value="$7,500.00"
        caption="Default selling price · per hour"
      />
    )

    expect(
      screen.getByText('Default selling price · per hour')
    ).toBeInTheDocument()
  })
})
