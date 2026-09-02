import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from './list-pane'

describe('ListPaneItem', () => {
  it('marks only the selected row as current', () => {
    render(
      <ListPane>
        <ListPaneHeader>Customers</ListPaneHeader>
        <ListPaneBody>
          <ListPaneItem
            href="/customers/cus_2kL9mN4q"
            label="View customer Alejandra Reyes"
            title="Alejandra Reyes"
            selected
          />
          <ListPaneItem
            href="/customers/cus_7pQ2rS5t"
            label="View customer Devon Blake"
            title="Devon Blake"
          />
        </ListPaneBody>
      </ListPane>
    )

    const selected = screen.getByRole('link', {
      name: 'View customer Alejandra Reyes',
    })
    expect(selected).toHaveAttribute('aria-current', 'true')
    expect(selected).toHaveAttribute('data-state', 'selected')

    const other = screen.getByRole('link', {
      name: 'View customer Devon Blake',
    })
    expect(other).not.toHaveAttribute('aria-current')
    expect(other).not.toHaveAttribute('data-state')
  })

  it('renders the subtitle and trailing slots only when given', () => {
    const { rerender } = render(
      <ListPaneBody>
        <ListPaneItem
          href="/items/itm_2kL9mN4q"
          label="View item Consulting hour"
          title="Consulting hour"
        />
      </ListPaneBody>
    )

    expect(screen.queryByText('SVC-001')).not.toBeInTheDocument()
    expect(screen.queryByText('$7,500')).not.toBeInTheDocument()

    rerender(
      <ListPaneBody>
        <ListPaneItem
          href="/items/itm_2kL9mN4q"
          label="View item Consulting hour"
          title="Consulting hour"
          subtitle="SVC-001"
          trailing="$7,500"
        />
      </ListPaneBody>
    )

    expect(screen.getByText('SVC-001')).toBeInTheDocument()
    expect(screen.getByText('$7,500')).toBeInTheDocument()
  })

  it('does not contain the overscroll-containment that traps the page scroll', () => {
    // Regression: `overscroll-contain` on an in-page pane stops the wheel from
    // reaching the page, and in Chrome it does so even when the pane has
    // nothing to scroll — the screen freezes under the cursor.
    render(<ListPaneBody data-testid="body" />)

    expect(screen.getByTestId('body').className).not.toContain('overscroll')
  })
})

describe('ListPaneEmpty', () => {
  it('renders in place of rows', () => {
    render(
      <ListPaneBody>
        <ListPaneEmpty>No customers yet</ListPaneEmpty>
      </ListPaneBody>
    )

    expect(screen.getByText('No customers yet')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
