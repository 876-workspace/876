// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { BlueprintEditor } from './blueprint-editor'
import type { Blueprint, Transition } from './types'

const STATES = [
  { key: 'open', label: 'Open' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
]

const FIELDS = ['summary', 'assignee']
const PERMISSIONS = ['projects.edit', 'projects.manage']

function makeTransition(overrides?: Partial<Transition>): Transition {
  return {
    id: null,
    fromStateKey: 'open',
    toStateKey: 'review',
    name: 'Start review',
    requiredPermission: null,
    requiredFieldKeys: [],
    requiresComment: false,
    ...overrides,
  }
}

function makeBlueprint(transitions: Transition[] = []): Blueprint {
  return {
    object: 'projects.blueprint',
    workItemTypeId: 'bug',
    transitions,
    updatedAt: Date.UTC(2026, 2, 4) / 1000,
  }
}

function transitionsOf(container: HTMLElement): Transition[] {
  const input = container.querySelector<HTMLInputElement>(
    'input[name="transitions"]'
  )
  if (!input) throw new Error('Expected a transitions input')
  return JSON.parse(input.value) as Transition[]
}

function renderEditor(blueprint: Blueprint = makeBlueprint([makeTransition()])) {
  const view = render(
    <BlueprintEditor
      initial={blueprint}
      availableStates={STATES}
      availableFieldKeys={FIELDS}
      permissionOptions={PERMISSIONS}
    />
  )
  return { ...view, transitions: () => transitionsOf(view.container) }
}

describe('BlueprintEditor', () => {
  afterEach(cleanup)

  it('renders one column per available state', () => {
    renderEditor()

    expect(
      document.querySelectorAll('[data-slot="blueprint-editor-column"]')
    ).toHaveLength(3)
  })

  it('labels columns with the destination state', () => {
    renderEditor()

    expect(screen.getByText('To Open')).toBeInTheDocument()
    expect(screen.getByText('To Review')).toBeInTheDocument()
    expect(screen.getByText('To Done')).toBeInTheDocument()
  })

  it('summarises a transition from a named state', () => {
    renderEditor()

    expect(screen.getByText(/Open.*→.*Review/)).toBeInTheDocument()
  })

  it('summarises a transition from any state', () => {
    renderEditor(makeBlueprint([makeTransition({ fromStateKey: null })]))

    expect(screen.getByText(/Any.*→.*Review/)).toBeInTheDocument()
  })

  it('says so when the blueprint has no transitions', () => {
    renderEditor(makeBlueprint([]))

    expect(screen.getByText(/No transitions yet/)).toBeInTheDocument()
    expect(
      document.querySelectorAll('[data-slot="blueprint-editor-transition"]')
    ).toHaveLength(0)
  })

  it('posts the transitions as a hidden field', () => {
    const { container } = renderEditor()
    const input = container.querySelector('input[name="transitions"]')

    expect(input).toHaveAttribute('type', 'hidden')
  })

  it('serializes the blueprint it was given', () => {
    const initial = [makeTransition()]
    const { transitions } = renderEditor(makeBlueprint(initial))

    expect(transitions()).toEqual(initial)
  })

  it('adds a transition', () => {
    const { transitions } = renderEditor(makeBlueprint([]))

    fireEvent.click(screen.getByRole('button', { name: 'Add transition' }))

    expect(transitions()).toHaveLength(1)
    expect(transitions()[0]).toEqual({
      id: null,
      fromStateKey: null,
      toStateKey: 'open',
      name: '',
      requiredPermission: null,
      requiredFieldKeys: [],
      requiresComment: false,
    })
  })

  it('removes a transition', () => {
    const { transitions } = renderEditor(
      makeBlueprint([makeTransition(), makeTransition({ name: 'Ship' })])
    )

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove' })[0]
    )

    expect(transitions()).toHaveLength(1)
    expect(transitions()[0].name).toBe('Ship')
  })

  it('edits the transition name', () => {
    const { transitions } = renderEditor()

    fireEvent.change(screen.getByLabelText('Transition 1 name'), {
      target: { value: 'Begin review' },
    })

    expect(transitions()[0].name).toBe('Begin review')
  })

  it('changes the from state, including back to any', () => {
    const { transitions } = renderEditor()

    fireEvent.change(screen.getByLabelText('Transition 1 from state'), {
      target: { value: '' },
    })
    expect(transitions()[0].fromStateKey).toBeNull()

    fireEvent.change(screen.getByLabelText('Transition 1 from state'), {
      target: { value: 'done' },
    })
    expect(transitions()[0].fromStateKey).toBe('done')
  })

  it('changes the to state', () => {
    const { transitions } = renderEditor()

    fireEvent.change(screen.getByLabelText('Transition 1 to state'), {
      target: { value: 'done' },
    })

    expect(transitions()[0].toStateKey).toBe('done')
  })

  it('changes the required permission, including back to none', () => {
    const { transitions } = renderEditor()

    fireEvent.change(
      screen.getByLabelText('Transition 1 required permission'),
      { target: { value: 'projects.edit' } }
    )
    expect(transitions()[0].requiredPermission).toBe('projects.edit')

    fireEvent.change(
      screen.getByLabelText('Transition 1 required permission'),
      { target: { value: '' } }
    )
    expect(transitions()[0].requiredPermission).toBeNull()
  })

  it('toggles a required field on and off', () => {
    const { transitions } = renderEditor()

    fireEvent.click(screen.getByRole('checkbox', { name: 'summary' }))
    expect(transitions()[0].requiredFieldKeys).toEqual(['summary'])

    fireEvent.click(screen.getByRole('checkbox', { name: 'summary' }))
    expect(transitions()[0].requiredFieldKeys).toEqual([])
  })

  it('toggles requires comment', () => {
    const { transitions } = renderEditor()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Requires comment' }))

    expect(transitions()[0].requiresComment).toBe(true)
  })

  it('moves the summary when the destination changes', () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Transition 1 to state'), {
      target: { value: 'done' },
    })

    expect(screen.getByText(/Open.*→.*Done/)).toBeInTheDocument()
  })

  it('submits the transitions through a surrounding form', () => {
    const initial = [makeTransition()]
    const { container } = render(
      <form>
        <BlueprintEditor
          initial={makeBlueprint(initial)}
          availableStates={STATES}
          availableFieldKeys={FIELDS}
          permissionOptions={PERMISSIONS}
        />
      </form>
    )
    const form = container.querySelector('form')
    if (!form) throw new Error('Expected a form')

    const posted = new FormData(form).get('transitions')
    if (typeof posted !== 'string') throw new Error('Expected transitions')

    expect(JSON.parse(posted)).toEqual(initial)
  })
})
