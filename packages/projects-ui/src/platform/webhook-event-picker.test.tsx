// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WebhookEventPicker } from './webhook-event-picker'

function eventCheckbox(label: string): HTMLElement {
  return screen.getByRole('checkbox', { name: label })
}

describe('WebhookEventPicker', () => {
  afterEach(cleanup)

  it('renders one checkbox per option', () => {
    render(<WebhookEventPicker options={['issue.created', 'time.logged']} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('names every checkbox input eventTypes', () => {
    render(<WebhookEventPicker options={['issue.created']} />)
    const inputs = document.querySelectorAll('input[type="checkbox"][name="eventTypes"]')
    expect(inputs).toHaveLength(1)
  })

  it('checks the default-selected events', () => {
    render(
      <WebhookEventPicker options={['issue.created', 'time.logged']} defaultSelected={['time.logged']} />
    )
    expect(eventCheckbox('time.logged')).toBeChecked()
    expect(eventCheckbox('issue.created')).not.toBeChecked()
  })

  it('checks an event when its label is clicked', () => {
    render(<WebhookEventPicker options={['issue.created']} />)
    fireEvent.click(screen.getByText('issue.created'))
    expect(eventCheckbox('issue.created')).toBeChecked()
  })

  it('renders a fallback with no options', () => {
    render(<WebhookEventPicker options={[]} />)
    expect(screen.getByText('No event types available')).toBeInTheDocument()
  })
})
