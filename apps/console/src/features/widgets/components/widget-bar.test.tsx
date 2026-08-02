// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WidgetBar } from './widget-bar'

describe('WidgetBar', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('renders a visible, explicitly sized icon in the Notepad trigger', () => {
    render(
      <WidgetBar
        auditEvents={[]}
        enabledWidgetIds={['notepad']}
        chatEnabled={false}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Notepad' })
    const icon = trigger.querySelector('svg')

    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('width')).toBe('20')
    expect(icon?.getAttribute('height')).toBe('20')
    expect(icon?.classList.contains('block')).toBe(true)
    expect(icon?.classList.contains('size-5')).toBe(true)
    expect(icon?.classList.contains('shrink-0')).toBe(true)
  })

  it('renders the chat-rail nav when chatEnabled is true', () => {
    render(
      <WidgetBar
        auditEvents={[]}
        enabledWidgetIds={['notepad']}
        chatEnabled={true}
      />
    )

    const chatRail = document.querySelector('[data-slot="chat-rail"]')
    expect(chatRail).not.toBeNull()
    expect(chatRail?.getAttribute('aria-label')).toBe('876 Chat')
  })

  it('does not render the chat-rail nav when chatEnabled is false', () => {
    render(
      <WidgetBar
        auditEvents={[]}
        enabledWidgetIds={['notepad']}
        chatEnabled={false}
      />
    )

    const chatRail = document.querySelector('[data-slot="chat-rail"]')
    expect(chatRail).toBeNull()
  })
})
