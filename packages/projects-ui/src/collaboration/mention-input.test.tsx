// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { MentionInput } from './mention-input'
import type { MentionPerson } from './mention-input'

const people: MentionPerson[] = [
  { userId: 'u_alice', label: 'Alice' },
  { userId: 'u_albert', label: 'Albert' },
  { userId: 'u_bob', label: 'Bob' },
]

function textarea(name = 'Message'): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name }) as HTMLTextAreaElement
}

function typeText(node: HTMLTextAreaElement, value: string) {
  node.setSelectionRange(value.length, value.length)
  fireEvent.change(node, { target: { value } })
}

describe('MentionInput', () => {
  afterEach(cleanup)

  it('renders a textarea named via the name prop', () => {
    render(<MentionInput name="body" people={people} />)

    expect(textarea()).toHaveAttribute('name', 'body')
  })

  it('renders with no function props', () => {
    render(<MentionInput name="body" people={people} />)

    expect(textarea()).toBeInTheDocument()
    expect(textarea().value).toBe('')
  })

  it('shows no suggestions before typing a trigger', () => {
    render(<MentionInput name="body" people={people} />)
    typeText(textarea(), 'Hello there')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('lists every person after typing a bare @', () => {
    render(<MentionInput name="body" people={people} />)
    typeText(textarea(), 'Hello @')

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('filters people as letters follow the @', () => {
    render(<MentionInput name="body" people={people} />)
    typeText(textarea(), 'Hello @al')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(options[0]).toHaveTextContent('Alice')
    expect(options[1]).toHaveTextContent('Albert')
  })

  it('matches case-insensitively', () => {
    render(<MentionInput name="body" people={people} />)
    typeText(textarea(), '@AL')

    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('hides the listbox when nothing matches', () => {
    render(<MentionInput name="body" people={people} />)
    typeText(textarea(), 'Hello @zzz')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('inserts a mention token for the highlighted person on Enter', () => {
    render(<MentionInput name="body" people={people} />)
    const node = textarea()
    typeText(node, 'Hello @al')
    fireEvent.keyDown(node, { key: 'Enter' })

    expect(node.value).toBe('Hello @[Alice](user:u_alice) ')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('moves the highlight with ArrowDown before Enter selects', () => {
    render(<MentionInput name="body" people={people} />)
    const node = textarea()
    typeText(node, '@al')
    fireEvent.keyDown(node, { key: 'ArrowDown' })
    fireEvent.keyDown(node, { key: 'Enter' })

    expect(node.value).toBe('@[Albert](user:u_albert) ')
  })

  it('wraps ArrowUp from the first option to the last', () => {
    render(<MentionInput name="body" people={people} />)
    const node = textarea()
    typeText(node, '@al')
    fireEvent.keyDown(node, { key: 'ArrowUp' })
    fireEvent.keyDown(node, { key: 'Enter' })

    expect(node.value).toBe('@[Albert](user:u_albert) ')
  })

  it('closes the listbox on Escape without changing the text', () => {
    render(<MentionInput name="body" people={people} />)
    const node = textarea()
    typeText(node, 'Hello @al')
    fireEvent.keyDown(node, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(node.value).toBe('Hello @al')
  })

  it('inserts on option mousedown while keeping preceding text', () => {
    render(<MentionInput name="body" people={people} />)
    const node = textarea()
    typeText(node, 'Review with @bo')
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Bob' }))

    expect(node.value).toBe('Review with @[Bob](user:u_bob) ')
  })
})
