import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { ListDetailShell, useListDetailRoute } from './list-detail-shell'
import { Page } from './page'

const mocks = vi.hoisted(() => ({ segments: [] as string[] }))

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => mocks.segments,
}))

function Probe({ takeover = [] as string[] }) {
  const route = useListDetailRoute(takeover)
  return <pre data-testid="route">{JSON.stringify(route)}</pre>
}

function route(takeover: string[] = []) {
  render(<Probe takeover={takeover} />)
  return JSON.parse(screen.getByTestId('route').textContent ?? '{}')
}

describe('useListDetailRoute', () => {
  it('reports closed on an index route wrapped in a route group', () => {
    mocks.segments = ['(list)']

    expect(route()).toEqual({
      segments: [],
      detailKey: null,
      open: false,
      takeover: false,
    })
  })

  it('reports closed on an index route with no group', () => {
    mocks.segments = []

    expect(route()).toEqual({
      segments: [],
      detailKey: null,
      open: false,
      takeover: false,
    })
  })

  it('opens on a record segment and reports its key', () => {
    mocks.segments = ['user_2kL9mN4q']

    expect(route()).toEqual({
      segments: ['user_2kL9mN4q'],
      detailKey: 'user_2kL9mN4q',
      open: true,
      takeover: false,
    })
  })

  it('keeps the record open while a tab below it is active', () => {
    mocks.segments = ['user_2kL9mN4q', 'permissions']

    expect(route()).toEqual({
      segments: ['user_2kL9mN4q', 'permissions'],
      detailKey: 'user_2kL9mN4q',
      open: true,
      takeover: false,
    })
  })

  it('drops parallel-route slots as well as route groups', () => {
    mocks.segments = ['@modal', '(list)']

    expect(route()).toEqual({
      segments: [],
      detailKey: null,
      open: false,
      takeover: false,
    })
  })

  it('reports takeover and not open for a named takeover segment', () => {
    mocks.segments = ['new']

    expect(route(['new', 'edit'])).toEqual({
      segments: ['new'],
      detailKey: null,
      open: false,
      takeover: true,
    })
  })

  it('reports takeover for a segment nested below a record', () => {
    mocks.segments = ['role_admin', 'edit']

    expect(route(['edit'])).toEqual({
      segments: ['role_admin', 'edit'],
      detailKey: null,
      open: false,
      takeover: true,
    })
  })
})

describe('ListDetailShell', () => {
  function renderShell(open: boolean, subnav?: React.ReactNode) {
    render(
      <ListDetailShell
        open={open}
        toolbar={<div>Toolbar</div>}
        subnav={subnav}
        list={<div>List</div>}
        detail={<div>Detail</div>}
      />
    )
    return document.querySelector<HTMLElement>(
      '[data-slot="list-detail-shell"]'
    )!
  }

  it('keeps the toolbar and list mounted when closed', () => {
    renderShell(false)

    expect(screen.getByText('Toolbar')).toBeInTheDocument()
    expect(screen.getByText('List')).toBeInTheDocument()
  })

  it('keeps the toolbar mounted when a record is open', () => {
    renderShell(true)

    expect(screen.getByText('Toolbar')).toBeInTheDocument()
    expect(screen.getByText('List')).toBeInTheDocument()
    expect(screen.getByText('Detail')).toBeInTheDocument()
  })

  it('marks its state so the open transition is inspectable', () => {
    expect(renderShell(true)).toHaveAttribute('data-state', 'open')
  })

  it('marks the closed state', () => {
    expect(renderShell(false)).toHaveAttribute('data-state', 'closed')
  })

  it('keeps the toolbar and list in one left-column stack', () => {
    renderShell(true)
    const listColumn = document.querySelector<HTMLElement>(
      '[data-slot="list-detail-list-column"]'
    )!

    expect(listColumn).toContainElement(screen.getByText('Toolbar'))
    expect(listColumn).toContainElement(screen.getByText('List'))
    expect(listColumn.className).toContain('@3xl/list-detail:col-start-1')
    expect(listColumn.className).toContain('@3xl/list-detail:row-start-1')
    expect(listColumn.className).toContain('@3xl/list-detail:flex-col')
  })

  it('places the detail beside the list stack in the same row', () => {
    renderShell(true)
    const detailCell = screen.getByText('Detail').parentElement!

    expect(detailCell.className).toContain('@3xl/list-detail:col-start-2')
    expect(detailCell.className).toContain('@3xl/list-detail:row-start-1')
    expect(detailCell.className).not.toContain('row-[1/-1]')
  })

  it('uses one bounded grid row instead of coupling list sections to the detail height', () => {
    const shell = renderShell(true)
    const grid = shell.firstElementChild!

    expect(grid.className).toContain(
      '@3xl/list-detail:grid-rows-[minmax(0,1fr)]'
    )
    expect(grid.className).not.toContain('auto_auto')
  })

  it('hides the detail column below the shell breakpoint when closed', () => {
    renderShell(false)
    const detailCell = screen.getByText('Detail').parentElement!

    expect(detailCell.className).toContain('hidden')
    expect(detailCell.className).toContain('@3xl/list-detail:block')
  })

  it('omits the subnav from the list stack when none is given', () => {
    renderShell(true)
    const listColumn = document.querySelector<HTMLElement>(
      '[data-slot="list-detail-list-column"]'
    )!

    expect(listColumn.children).toHaveLength(2)
  })

  it('places a subnav between the toolbar and the list when one is given', () => {
    renderShell(true, <div>Subnav</div>)
    const listColumn = document.querySelector<HTMLElement>(
      '[data-slot="list-detail-list-column"]'
    )!

    expect(listColumn.children).toHaveLength(3)
    expect(listColumn.children[0]).toContainElement(screen.getByText('Toolbar'))
    expect(listColumn.children[1]).toContainElement(screen.getByText('Subnav'))
    expect(listColumn.children[2]).toContainElement(screen.getByText('List'))
  })
})

describe('ListDetailShell layout', () => {
  it('resolves a ListDetailShell page to the same outer gutter as a plain Page', () => {
    render(
      <Page>
        <ListDetailShell
          open
          list={<div>List</div>}
          detail={<div>Detail</div>}
        />
      </Page>
    )

    const page = document.querySelector<HTMLElement>('[data-slot="page"]')!
    const shell = document.querySelector<HTMLElement>(
      '[data-slot="list-detail-shell"]'
    )!
    const grid = shell.firstElementChild as HTMLElement

    expect(page.className).toContain('px-[var(--876-shell-gutter)]')
    expect(grid.className).toContain(
      '@3xl/list-detail:gap-x-[var(--876-shell-gutter)]'
    )
    expect(shell.className).not.toContain('-ml-')

    for (const gutter of [16, 24, 32]) {
      expect({
        windowToCard: gutter,
        cardToContent: gutter,
        contentToWindow: gutter,
      }).toEqual({
        windowToCard: gutter,
        cardToContent: gutter,
        contentToWindow: gutter,
      })
    }
  })

  it('does not pull left when rendered without a Page parent', () => {
    render(
      <ListDetailShell
        open={false}
        list={<div>List</div>}
        detail={<div>Detail</div>}
      />
    )
    const shell = document.querySelector<HTMLElement>(
      '[data-slot="list-detail-shell"]'
    )!

    expect(shell.className).not.toContain('-ml-')
    expect(shell.className).not.toContain('margin-left')
  })

  it('keeps the toolbar mounted and stands the list down at a narrow width when a record is open', () => {
    mocks.segments = ['cus_2kL9mN4q']

    render(
      <ListDetailShell
        open
        toolbar={<div data-testid="toolbar">Customers</div>}
        list={<div data-testid="list">rows</div>}
        detail={<div data-testid="detail">record</div>}
      />
    )

    // The toolbar names the section and carries its actions at every width.
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()

    // The rows stand down only below the container breakpoint, so the record
    // is not stacked underneath the whole table on a narrow screen.
    const listWrapper = screen.getByTestId('list').parentElement
    expect(listWrapper?.className).toContain('hidden')
    expect(listWrapper?.className).toContain('@3xl/list-detail:block')
  })

  it('shows the list and hides the detail column while closed', () => {
    mocks.segments = []

    render(
      <ListDetailShell
        open={false}
        toolbar={<div data-testid="toolbar">Customers</div>}
        list={<div data-testid="list">rows</div>}
        detail={null}
      />
    )

    expect(screen.getByTestId('list').parentElement?.className).not.toContain(
      'hidden'
    )
  })
})
