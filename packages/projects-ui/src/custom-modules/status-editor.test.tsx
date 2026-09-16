// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { StatusEditor } from './status-editor'
import type { CustomModuleStatus } from './types'

function makeStatuses(): CustomModuleStatus[] {
  return [
    { key: 'backlog', label: 'Backlog', category: 'open', position: 0 },
    { key: 'doing', label: 'Doing', category: 'in-progress', position: 1 },
    { key: 'shipped', label: 'Shipped', category: 'done', position: 2 },
  ]
}

function statusesOf(container: HTMLElement): CustomModuleStatus[] {
  const input = container.querySelector<HTMLInputElement>(
    'input[name="statuses"]'
  )
  if (!input) throw new Error('Expected a statuses input')
  return JSON.parse(input.value) as CustomModuleStatus[]
}

function renderEditor(initial: CustomModuleStatus[] = makeStatuses()) {
  const view = render(<StatusEditor initial={initial} />)
  return { ...view, statuses: () => statusesOf(view.container) }
}

describe('StatusEditor', () => {
  afterEach(cleanup)

  it('posts the statuses as a hidden field', () => {
    const { container } = renderEditor()
    const input = container.querySelector('input[name="statuses"]')

    expect(input).toHaveAttribute('type', 'hidden')
    expect(input).toHaveAttribute('name', 'statuses')
  })

  it('serializes the statuses it was given', () => {
    const { statuses } = renderEditor()

    expect(statuses()).toEqual(makeStatuses())
  })

  it('sorts initial statuses by position', () => {
    const reversed = [...makeStatuses()].reverse()
    const { statuses } = renderEditor(reversed)

    expect(statuses().map((status) => status.key)).toEqual([
      'backlog',
      'doing',
      'shipped',
    ])
  })

  it('edits a status label', () => {
    const { statuses } = renderEditor()

    fireEvent.change(screen.getByLabelText('Label', { selector: '#status-1-label' }), {
      target: { value: 'In progress' },
    })

    expect(statuses()[1].label).toBe('In progress')
  })

  it('edits a status key', () => {
    const { statuses } = renderEditor()

    fireEvent.change(screen.getByLabelText('Key', { selector: '#status-0-key' }), {
      target: { value: 'todo' },
    })

    expect(statuses()[0].key).toBe('todo')
  })

  it('changes a status category', () => {
    const { statuses } = renderEditor()

    fireEvent.change(
      screen.getByLabelText('Category', { selector: '#status-0-category' }),
      { target: { value: 'done' } }
    )

    expect(statuses()[0].category).toBe('done')
  })

  it('adds a status with a generated key', () => {
    const { statuses } = renderEditor()

    fireEvent.click(screen.getByRole('button', { name: 'Add status' }))

    const next = statuses()
    expect(next).toHaveLength(4)
    expect(next[3].category).toBe('open')
  })

  it('removes a status', () => {
    const { statuses } = renderEditor()

    const removes = screen.getAllByRole('button', { name: 'Remove' })
    fireEvent.click(removes[0])

    expect(statuses().map((status) => status.key)).toEqual([
      'doing',
      'shipped',
    ])
  })

  it('moves a status down and renumbers positions', () => {
    const { statuses } = renderEditor()

    const downs = screen.getAllByRole('button', { name: 'Move down' })
    fireEvent.click(downs[0])

    const next = statuses()
    expect(next.map((status) => status.key)).toEqual([
      'doing',
      'backlog',
      'shipped',
    ])
    expect(next.map((status) => status.position)).toEqual([0, 1, 2])
  })

  it('moves a status up and renumbers positions', () => {
    const { statuses } = renderEditor()

    const ups = screen.getAllByRole('button', { name: 'Move up' })
    fireEvent.click(ups[1])

    const next = statuses()
    expect(next.map((status) => status.key)).toEqual([
      'doing',
      'backlog',
      'shipped',
    ])
    expect(next.map((status) => status.position)).toEqual([0, 1, 2])
  })

  it('shows an empty hint with no statuses', () => {
    renderEditor([])

    expect(screen.getByText('No statuses yet.')).toBeInTheDocument()
  })
})
