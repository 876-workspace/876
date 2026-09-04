import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ListRow, ListRowGroup } from './list-row'

describe('ListRow slots', () => {
  it('Title-only row, with no optional slots, renders no link or button', () => {
    render(
      <ListRowGroup>
        <ListRow title="Fix the auth race condition" />
      </ListRowGroup>
    )

    expect(screen.getByText('Fix the auth race condition')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('All slots, with every slot filled, render every slot', () => {
    render(
      <ListRowGroup>
        <ListRow
          href="/issues/ALP-12"
          leading={<span>ALP</span>}
          title="Fix the auth race condition"
          subtitle="ALP-12 · Alpine"
          meta="2h ago"
          trailing={<span>In progress</span>}
        />
      </ListRowGroup>
    )

    expect(screen.getByText('ALP')).toBeInTheDocument()
    expect(screen.getByText('Fix the auth race condition')).toBeInTheDocument()
    expect(screen.getByText('ALP-12 · Alpine')).toBeInTheDocument()
    expect(screen.getByText('2h ago')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('Subtitle slot, with title and subtitle, renders both texts', () => {
    render(
      <ListRowGroup>
        <ListRow
          title="Add rate limiting to the webhook endpoint"
          subtitle="ALP-13 · Alpine"
        />
      </ListRowGroup>
    )

    expect(
      screen.getByText('Add rate limiting to the webhook endpoint')
    ).toBeInTheDocument()
    expect(screen.getByText('ALP-13 · Alpine')).toBeInTheDocument()
  })

  it('Meta slot, with title and meta, renders the meta text', () => {
    render(
      <ListRowGroup>
        <ListRow title="Refresh the billing receipt email copy" meta="3d ago" />
      </ListRowGroup>
    )

    expect(
      screen.getByText('Refresh the billing receipt email copy')
    ).toBeInTheDocument()
    expect(screen.getByText('3d ago')).toBeInTheDocument()
  })

  it('Trailing slot, with title and trailing, renders the trailing content', () => {
    render(
      <ListRowGroup>
        <ListRow
          title="Rotate the staging credentials"
          trailing={<span>Todo</span>}
        />
      </ListRowGroup>
    )

    expect(
      screen.getByText('Rotate the staging credentials')
    ).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })

  it('Leading slot, with title and leading, renders the leading content', () => {
    render(
      <ListRowGroup>
        <ListRow
          title="Replay the queued webhook events"
          leading={<span>ALP</span>}
        />
      </ListRowGroup>
    )

    expect(
      screen.getByText('Replay the queued webhook events')
    ).toBeInTheDocument()
    expect(screen.getByText('ALP')).toBeInTheDocument()
  })

  it('Long title, with a full incident summary, remains fully in the document', () => {
    const longTitle =
      'Migrate the legacy billing webhooks to the new versioned event pipeline before the October freeze, including replay support for failed deliveries'

    render(
      <ListRowGroup>
        <ListRow title={longTitle} subtitle="ALP-21 · Alpine" />
      </ListRowGroup>
    )

    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  it('Omitted slots, on a title-only row, render nothing beyond the title', () => {
    render(
      <ListRowGroup>
        <ListRow title="Fix the auth race condition" />
      </ListRowGroup>
    )
    const item = screen.getByRole('listitem')

    expect(
      within(item).getByText('Fix the auth race condition')
    ).toBeInTheDocument()
    expect(item.textContent).toBe('Fix the auth race condition')
  })
})

describe('ListRow interaction', () => {
  it('OnClick row, without an href, renders a button that fires the handler', () => {
    const handleClick = vi.fn()
    render(
      <ListRowGroup>
        <ListRow
          title="Triage the overnight support backlog"
          subtitle="ALP-30 · Alpine"
          onClick={handleClick}
        />
      </ListRowGroup>
    )
    const rowButton = screen.getByRole('button', {
      name: /Triage the overnight support backlog/,
    })

    expect(rowButton).toContainElement(
      screen.getByText('Triage the overnight support backlog')
    )

    fireEvent.click(rowButton)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('Href row, with both href and onClick, renders a link and no button', () => {
    const handleClick = vi.fn()
    render(
      <ListRowGroup>
        <ListRow
          href="/issues/ALP-12"
          onClick={handleClick}
          title="Fix the auth race condition"
        />
      </ListRowGroup>
    )

    expect(screen.getByRole('link')).toHaveAttribute('href', '/issues/ALP-12')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('Trailing action, inside a linked row, keeps exactly one link', () => {
    render(
      <ListRowGroup>
        <ListRow
          href="/issues/ALP-12"
          title="Fix the auth race condition"
          subtitle="ALP-12 · Alpine"
          trailing={<button type="button">Follow</button>}
        />
      </ListRowGroup>
    )

    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument()
  })
})

describe('ListRow group', () => {
  it('Group, with three rows, renders a list with one item per row', () => {
    render(
      <ListRowGroup>
        <ListRow title="Fix the auth race condition" />
        <ListRow title="Add rate limiting to the webhook endpoint" />
        <ListRow title="Refresh the billing receipt email copy" />
      </ListRowGroup>
    )
    const list = screen.getByRole('list')

    expect(list).toHaveAttribute('data-slot', 'list-row-group')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('Row className, on a linked row, appears on the link element', () => {
    render(
      <ListRowGroup>
        <ListRow
          href="/issues/ALP-12"
          title="Fix the auth race condition"
          className="issue-highlight"
        />
      </ListRowGroup>
    )

    expect(screen.getByRole('link')).toHaveClass('issue-highlight')
  })

  it('Group className, on the group, appears on the list element', () => {
    render(
      <ListRowGroup className="queue-group">
        <ListRow title="Fix the auth race condition" />
      </ListRowGroup>
    )

    expect(screen.getByRole('list')).toHaveClass('queue-group')
  })
})
