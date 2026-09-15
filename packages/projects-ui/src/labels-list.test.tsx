// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Label } from '@876/projects/contracts'

import { LabelsTable } from './labels-list'

function makeLabel(overrides?: Partial<Label>): Label {
  return {
    object: 'projects.label',
    id: 'lbl_bug',
    tenantId: 'tenant_1',
    name: 'bug',
    color: '#e5484d',
    description: 'Crashes and broken behavior',
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

const bugLabel = makeLabel()
const enhancementLabel = makeLabel({
  id: 'lbl_enhancement',
  name: 'enhancement',
  color: '#3e9b4f',
  description: 'New capabilities and improvements',
})
const docsLabel = makeLabel({
  id: 'lbl_docs',
  name: 'docs',
  color: '#3e63dd',
  description: null,
})

const labels = [bugLabel, enhancementLabel, docsLabel]

function mobileList(container: HTMLElement): HTMLElement {
  const list = container.querySelector('ul')
  if (!list) throw new Error('Expected a mobile list')
  return list as HTMLElement
}

function swatchesWithBackground(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll('span[aria-hidden="true"]')
  ).filter(
    (element) => (element as HTMLElement).style.backgroundColor !== ''
  ) as HTMLElement[]
}

function badgesWithBorder(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('*')).filter(
    (element) => (element as HTMLElement).style.borderColor !== ''
  ) as HTMLElement[]
}

describe('LabelsTable', () => {
  afterEach(cleanup)

  it('list, with labels, renders the desktop table', () => {
    render(<LabelsTable labels={labels} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('list, with labels, renders one mobile row per label', () => {
    const { container } = render(<LabelsTable labels={labels} />)

    expect(mobileList(container).querySelectorAll(':scope > li')).toHaveLength(
      3
    )
  })

  it('list, with labels, shows each name in both the table and the mobile rows', () => {
    render(<LabelsTable labels={labels} />)

    expect(screen.getAllByText('bug')).toHaveLength(2)
    expect(screen.getAllByText('enhancement')).toHaveLength(2)
    expect(screen.getAllByText('docs')).toHaveLength(2)
  })

  it('headers, on render, label the Label, Color, and Description columns', () => {
    render(<LabelsTable labels={labels} />)

    expect(screen.getByText('Label')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
  })

  it('row, with a color, shows the hex value', () => {
    render(<LabelsTable labels={labels} />)

    expect(screen.getAllByText('#e5484d')).toHaveLength(1)
    expect(screen.getAllByText('#3e9b4f')).toHaveLength(1)
    expect(screen.getAllByText('#3e63dd')).toHaveLength(2)
  })

  it('row, with a description, shows the description in the table and the mobile row', () => {
    render(<LabelsTable labels={labels} />)

    expect(screen.getAllByText('Crashes and broken behavior')).toHaveLength(2)
    expect(
      screen.getAllByText('New capabilities and improvements')
    ).toHaveLength(2)
  })

  it('row, without a description, falls back to an em dash in the table', () => {
    render(<LabelsTable labels={[docsLabel]} />)

    const table = screen.getByRole('table')

    expect(within(table).getByText('—')).toBeInTheDocument()
  })

  it('row, with an empty description, falls back to an em dash in the table', () => {
    const emptyDescription = makeLabel({
      id: 'lbl_empty',
      name: 'chore',
      color: '#8b8d98',
      description: '',
    })

    render(<LabelsTable labels={[emptyDescription]} />)

    const table = screen.getByRole('table')

    expect(within(table).getByText('—')).toBeInTheDocument()
  })

  it('swatch, on render, carries the label color as its background', () => {
    const { container } = render(<LabelsTable labels={[bugLabel]} />)

    const swatches = swatchesWithBackground(container)

    expect(swatches).toHaveLength(2)
  })

  it('swatch, on render, stays hidden from assistive tech', () => {
    const { container } = render(<LabelsTable labels={[bugLabel]} />)

    const swatches = swatchesWithBackground(container)

    for (const swatch of swatches) {
      expect(swatch).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('badge, on render, outlines with the label color', () => {
    const { container } = render(
      <LabelsTable labels={[bugLabel, enhancementLabel]} />
    )

    expect(badgesWithBorder(container)).toHaveLength(2)
  })

  it('mobile row, on render, leads with the label color dot', () => {
    const { container } = render(<LabelsTable labels={labels} />)

    const rows = mobileList(container).querySelectorAll(':scope > li')

    expect(rows).toHaveLength(3)
    for (const row of rows) {
      const dot = (row as HTMLElement).querySelector(
        'span[aria-hidden="true"]'
      ) as HTMLElement | null
      expect(dot).not.toBeNull()
      expect(dot?.style.backgroundColor).not.toBe('')
    }
  })

  it('mobile cell, on render, shows the name and description without a link', () => {
    const { container } = render(<LabelsTable labels={[bugLabel]} />)

    const list = mobileList(container)

    expect(within(list).getByText('bug')).toBeInTheDocument()
    expect(within(list).queryByText('#e5484d')).toBeNull()
    expect(
      within(list).getByText('Crashes and broken behavior')
    ).toBeInTheDocument()
    expect(within(list).queryByRole('link')).toBeNull()
  })

  it('rows, on render, expose no accessible links since labels have no detail route', () => {
    const { container } = render(<LabelsTable labels={labels} />)

    expect(within(mobileList(container)).queryByRole('link')).toBeNull()
  })

  it('table, on render, exposes no accessible links', () => {
    render(<LabelsTable labels={labels} />)

    const table = screen.getByRole('table')

    expect(within(table).queryByRole('link')).toBeNull()
  })

  it('empty list, on render, shows the no-labels message in both table and mobile forms', () => {
    render(<LabelsTable labels={[]} />)

    expect(screen.getAllByText('No labels yet')).toHaveLength(2)
  })

  it('empty list, on render, keeps the table mounted with no data rows', () => {
    render(<LabelsTable labels={[]} />)

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')

    expect(rows).toHaveLength(2)
    expect(screen.queryByText('bug')).toBeNull()
  })

  it('empty list, on render, shows no mobile data rows', () => {
    const { container } = render(<LabelsTable labels={[]} />)

    expect(mobileList(container).querySelectorAll(':scope > li')).toHaveLength(
      1
    )
  })

  it('list, with three labels, renders three table body rows', () => {
    render(<LabelsTable labels={labels} />)

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')

    expect(rows).toHaveLength(4)
  })

  it('list, with three labels, keeps every color visible', () => {
    const { container } = render(<LabelsTable labels={labels} />)

    const swatches = swatchesWithBackground(container)

    expect(swatches).toHaveLength(6)
  })

  it('list, on render, provides no condensed detail pane', () => {
    render(<LabelsTable labels={labels} />)

    expect(screen.queryByText('Labels')).toBeNull()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('mobile rows, on render, match the label count', () => {
    const { container } = render(
      <LabelsTable labels={[bugLabel, enhancementLabel]} />
    )

    expect(mobileList(container).querySelectorAll(':scope > li')).toHaveLength(
      2
    )
    expect(screen.getAllByText('bug')).toHaveLength(2)
    expect(screen.getAllByText('enhancement')).toHaveLength(2)
  })
})
