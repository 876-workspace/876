// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WidgetPopout } from './widget-popout'
import type { WidgetSizePolicy } from '../types/widget-size'
import { RAIL_WIDTH_PX, PANEL_GUTTER_PX } from '../types/widget-size'

let layoutWidth = 1_200

const notepadPolicy = {
  default: 'md',
  allowed: ['sm', 'md', 'lg', 'xl', 'fill'],
  remember: false,
  accent: '#F59E0B',
} as const satisfies WidgetSizePolicy

const lockedXlPolicy = {
  default: 'xl',
  allowed: ['xl'],
  accent: '#06B6D4',
} as const satisfies WidgetSizePolicy

function PanelFixture({
  size = 'md',
  sizePolicyByItem,
  defaultOpen = 'draft',
}: {
  size?: 'md' | 'xl'
  sizePolicyByItem?: Partial<Record<string, WidgetSizePolicy>>
  defaultOpen?: string | null
}) {
  return (
    <div>
      <WidgetPopout.Root
        defaultOpen={defaultOpen}
        defaultSize={size}
        host="test"
        sizePolicyByItem={sizePolicyByItem}
      >
        <WidgetPopout.Panel size={size}>
          <WidgetPopout.Content id="draft" title="Draft widget">
            <input aria-label="Draft value" defaultValue="Initial draft" />
          </WidgetPopout.Content>
          <WidgetPopout.Content id="logs" title="Live logs">
            <div>Logs body</div>
          </WidgetPopout.Content>
        </WidgetPopout.Panel>
        <WidgetPopout.Rail>
          <WidgetPopout.Trigger id="draft" label="Draft" icon="D" />
          <WidgetPopout.Trigger id="logs" label="Logs" icon="L" />
        </WidgetPopout.Rail>
      </WidgetPopout.Root>
    </div>
  )
}

describe('Widget popout panel', () => {
  beforeEach(() => {
    cleanup()
    layoutWidth = 1_200
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
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({
        width: layoutWidth,
        height: 800,
        top: 0,
        right: layoutWidth,
        bottom: 800,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
    )
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: layoutWidth,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the same content tree when toggling docked and popout modes', async () => {
    render(<PanelFixture />)

    const input = screen.getByLabelText('Draft value')
    fireEvent.change(input, { target: { value: 'Unsaved local draft' } })

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)

    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('docked')
    })
    expect(screen.getByLabelText('Draft value')).toBe(input)
    expect((input as HTMLInputElement).value).toBe('Unsaved local draft')

    fireEvent.click(screen.getByRole('button', { name: 'Pop out panel' }))
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('popout')
    })
    expect(screen.getByLabelText('Draft value')).toBe(input)
  })

  it('disables docking when the main column would be narrower than 600px', async () => {
    layoutWidth = 1_000
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: layoutWidth,
    })
    render(<PanelFixture />)

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    expect((dockButton as HTMLButtonElement).disabled).toBe(true)
    expect(dockButton.getAttribute('title')).toBe(
      'Not enough room to dock this panel'
    )
  })

  it('forces a docked panel back to popout when the layout becomes too narrow', async () => {
    render(<PanelFixture />)

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('docked')
    })

    layoutWidth = 1_000
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: layoutWidth,
    })
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(
        document
          .querySelector('[data-slot="widget-panel"]')
          ?.getAttribute('data-presentation')
      ).toBe('popout')
    })
  })

  it('clamps an xl floating panel to the viewport minus rail and gutter', () => {
    render(<PanelFixture size="xl" />)

    const panel = document.querySelector(
      '[data-slot="widget-panel"]'
    ) as HTMLElement
    expect(panel.style.width).toBe('720px')
    const maxPad = RAIL_WIDTH_PX + PANEL_GUTTER_PX * 2
    expect(panel.style.maxWidth).toBe(`calc(100vw - ${maxPad}px)`)
    expect(panel.getAttribute('data-can-dock')).toBe('false')
  })

  it('offsets the floating panel from the rail and trims vertical height', () => {
    render(<PanelFixture />)

    const panel = document.querySelector(
      '[data-slot="widget-panel"]'
    ) as HTMLElement
    // rail + gutter
    expect(panel.style.right).toBe(`${RAIL_WIDTH_PX + PANEL_GUTTER_PX}px`)
    expect(panel.style.top).toBe('74px') // default navbar 64 + inset 10
    expect(panel.style.bottom).toBe('10px')
  })

  it('uses a minus icon for dock and a panel icon for pop out', async () => {
    render(<PanelFixture />)

    expect(
      screen.getByRole('button', { name: 'Dock panel to layout' })
    ).toBeInTheDocument()

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Pop out panel' })
      ).toBeInTheDocument()
    })
  })

  it('renders an active rail edge pill on the selected trigger', () => {
    render(<PanelFixture sizePolicyByItem={{ draft: notepadPolicy }} />)

    const trigger = screen.getByRole('button', { name: 'Draft' })
    const pill = trigger.querySelector('[aria-hidden="true"]')
    expect(pill).not.toBeNull()
    expect(pill?.className).toContain('absolute')
  })

  it('shows a size palette for multi-size widgets and applies size changes', async () => {
    render(<PanelFixture sizePolicyByItem={{ draft: notepadPolicy }} />)

    const large = await screen.findByRole('radio', {
      name: /Large — 520px/,
    })
    fireEvent.click(large)

    await waitFor(() => {
      const panel = document.querySelector(
        '[data-slot="widget-panel"]'
      ) as HTMLElement
      expect(panel.getAttribute('data-size')).toBe('lg')
      expect(panel.style.width).toBe('520px')
    })
  })

  it('hides the size control when the widget is locked to one size', async () => {
    render(
      <PanelFixture
        defaultOpen="logs"
        size="xl"
        sizePolicyByItem={{ logs: lockedXlPolicy }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Logs body')).toBeInTheDocument()
    })
    expect(screen.queryByRole('radiogroup', { name: 'Widget size' })).toBeNull()
  })

  it('resolves docked fill width as available minus rail and min main column', async () => {
    layoutWidth = 1_400
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: layoutWidth,
    })
    render(<PanelFixture sizePolicyByItem={{ draft: notepadPolicy }} />)

    const fill = await screen.findByRole('radio', {
      name: /Fill — workspace/,
    })
    fireEvent.click(fill)

    const dockButton = await screen.findByRole('button', {
      name: 'Dock panel to layout',
    })
    await waitFor(() =>
      expect((dockButton as HTMLButtonElement).disabled).toBe(false)
    )
    fireEvent.click(dockButton)

    await waitFor(() => {
      const panel = document.querySelector(
        '[data-slot="widget-panel"]'
      ) as HTMLElement
      expect(panel.getAttribute('data-presentation')).toBe('docked')
      // 1400 - 60 - 600 = 740
      expect(panel.style.width).toBe('740px')
      expect(panel.getAttribute('data-size')).toBe('fill')
    })
  })
})
