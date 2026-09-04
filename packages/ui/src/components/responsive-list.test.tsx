import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ResponsiveList } from './responsive-list'

afterEach(() => {
  vi.restoreAllMocks()
})

type IssueRow = {
  id: string
  title: string
  project: string
  updated: string
  status: string
}

const rows: IssueRow[] = [
  {
    id: 'ALP-12',
    title: 'Fix the auth race condition',
    project: 'Alpine · Backend',
    updated: '2h ago',
    status: 'In progress',
  },
  {
    id: 'ALP-13',
    title: 'Add rate limiting to the webhook endpoint',
    project: 'Alpine · Platform',
    updated: '1d ago',
    status: 'Todo',
  },
  {
    id: 'ALP-14',
    title: 'Refresh the billing receipt email copy',
    project: 'Alpine · Billing',
    updated: '3d ago',
    status: 'Done',
  },
]

const fullMapping = {
  key: (row: IssueRow) => row.id,
  href: (row: IssueRow) => `/issues/${row.id}`,
  leading: (row: IssueRow) => <span>{row.id}</span>,
  title: (row: IssueRow) => row.title,
  subtitle: (row: IssueRow) => row.project,
  meta: (row: IssueRow) => row.updated,
  trailing: (row: IssueRow) => <span>{row.status}</span>,
}

function desktopTable() {
  return (
    <table aria-label="Sprint queue">
      <thead>
        <tr>
          <th>Issue</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Desktop columns</td>
          <td>Visible on wide screens</td>
        </tr>
      </tbody>
    </table>
  )
}

describe('ResponsiveList', () => {
  it('Table node, alongside row cards, renders the desktop table element', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    expect(
      screen.getByRole('table', { name: 'Sprint queue' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('Rows, with three issues, render one list row per issue', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )
    const list = screen.getByRole('list')

    const items = within(list).getAllByRole('listitem')

    expect(items).toHaveLength(3)
  })

  it('Title mapping, for every row, shows each issue title', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    for (const row of rows) {
      expect(screen.getByText(row.title)).toBeInTheDocument()
    }
  })

  it('Subtitle mapping, for every row, shows the project name', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    for (const row of rows) {
      expect(screen.getByText(row.project)).toBeInTheDocument()
    }
  })

  it('Meta mapping, for every row, shows the updated timestamp', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    for (const row of rows) {
      expect(screen.getByText(row.updated)).toBeInTheDocument()
    }
  })

  it('Trailing mapping, for every row, shows the status pill', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    for (const row of rows) {
      expect(screen.getByText(row.status)).toBeInTheDocument()
    }
  })

  it('Leading mapping, for every row, shows the issue key badge', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    for (const row of rows) {
      expect(screen.getByText(row.id)).toBeInTheDocument()
    }
  })

  it('Href mapping, when every row has a link, yields one link per row', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )
    const links = screen.getAllByRole('link')

    expect(links).toHaveLength(3)

    for (const row of rows) {
      const link = links.find(
        (candidate) => candidate.getAttribute('href') === `/issues/${row.id}`
      )

      expect(link).toBeDefined()
      expect(
        within(link as HTMLElement).getByText(row.title)
      ).toBeInTheDocument()
    }
  })

  it('Rows, without any href mapping, render no links at all', () => {
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={{
          key: fullMapping.key,
          leading: fullMapping.leading,
          title: fullMapping.title,
          subtitle: fullMapping.subtitle,
          meta: fullMapping.meta,
          trailing: fullMapping.trailing,
        }}
      />
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()

    for (const row of rows) {
      expect(screen.getByText(row.title)).toBeInTheDocument()
    }
  })

  it('OnClick mapping, when a row button is clicked, calls the mapped handler', () => {
    const handleSelect = vi.fn()
    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={{
          key: fullMapping.key,
          onClick: () => handleSelect,
          title: fullMapping.title,
          subtitle: fullMapping.subtitle,
        }}
      />
    )
    const rowButton = screen.getByRole('button', {
      name: /Fix the auth race condition/,
    })

    fireEvent.click(rowButton)

    expect(handleSelect).toHaveBeenCalledTimes(1)
  })

  it('Empty rows, with an empty node, render the empty message', () => {
    render(
      <ResponsiveList
        rows={[]}
        table={desktopTable()}
        mapping={fullMapping}
        empty={<p>No open issues. Your queue is clear.</p>}
      />
    )

    expect(
      screen.getByText('No open issues. Your queue is clear.')
    ).toBeInTheDocument()
  })

  it('Empty rows, render a group with no list rows', () => {
    render(
      <ResponsiveList
        rows={[]}
        table={desktopTable()}
        mapping={fullMapping}
        empty={<p>No open issues. Your queue is clear.</p>}
      />
    )
    const list = screen.getByRole('list')

    expect(within(list).queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('Key mapping, with unique keys, logs no React key warnings', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ResponsiveList
        rows={rows}
        table={desktopTable()}
        mapping={fullMapping}
      />
    )

    const keyWarnings = errorSpy.mock.calls.filter((call) =>
      call.some(
        (arg: unknown) =>
          typeof arg === 'string' &&
          (arg.includes('unique "key"') || arg.includes('unique key'))
      )
    )

    expect(keyWarnings).toHaveLength(0)
  })

  it('Mixed href rows, with only some rows linked, render a link only for the linked row', () => {
    const pair = rows.slice(0, 2)
    render(
      <ResponsiveList
        rows={pair}
        table={desktopTable()}
        mapping={{
          ...fullMapping,
          href: (row: IssueRow) =>
            row.id === 'ALP-12' ? `/issues/${row.id}` : undefined,
        }}
      />
    )
    const links = screen.getAllByRole('link')

    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/issues/ALP-12')
    expect(
      screen.getByText('Add rate limiting to the webhook endpoint')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
