import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  SETTINGS_HUB_ICON_KEYS,
  SettingsHub,
  type SettingsHubGroup,
  type SettingsHubItem,
} from './settings-hub'

const groups: SettingsHubGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Teams',
        icon: 'teams',
        availability: 'available',
        href: '/settings/teams',
      },
      { label: 'Members', icon: 'members', availability: 'planned' },
    ],
  },
  {
    label: 'Requests',
    items: [
      {
        label: 'Priorities',
        icon: 'priorities',
        availability: 'available',
        href: '/settings/priorities',
      },
    ],
  },
]

describe('SettingsHub', () => {
  it('renders every group label', () => {
    render(<SettingsHub groups={groups} />)

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Requests' })).toBeVisible()
  })

  it('renders an available item with an href as a link', () => {
    render(<SettingsHub groups={groups} />)

    expect(screen.getByRole('link', { name: 'Teams' })).toHaveAttribute(
      'href',
      '/settings/teams'
    )
  })

  it('renders a planned item without a link and with its badge', () => {
    render(<SettingsHub groups={groups} />)

    expect(
      screen.queryByRole('link', { name: 'Members' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('Members').parentElement).toHaveTextContent(
      'Planned'
    )
  })

  it('treats an available item without an href as planned', () => {
    const missingHref: SettingsHubGroup[] = [
      {
        label: 'Guard',
        items: [
          {
            label: 'No destination',
            icon: 'access',
            availability: 'available',
          },
        ],
      },
    ]

    render(<SettingsHub groups={missingHref} />)

    expect(
      screen.queryByRole('link', { name: 'No destination' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('No destination').parentElement).toHaveTextContent(
      'Planned'
    )
  })

  it('renders no cards for an empty groups array', () => {
    const { container } = render(<SettingsHub groups={[]} />)

    expect(container.querySelectorAll('section')).toHaveLength(0)
  })

  it('renders a zero-item group with an empty list', () => {
    const emptyGroup: SettingsHubGroup[] = [{ label: 'Empty', items: [] }]

    render(<SettingsHub groups={emptyGroup} />)

    const section = screen
      .getByRole('heading', { name: 'Empty' })
      .closest('section')
    expect(section?.querySelector('ul')?.children).toHaveLength(0)
  })

  it('resolves every exported icon key to an icon element', () => {
    const iconItems: SettingsHubItem[] = SETTINGS_HUB_ICON_KEYS.map((icon) => ({
      label: icon,
      icon,
      availability: 'planned',
    }))

    const { container } = render(
      <SettingsHub groups={[{ label: 'Icons', items: iconItems }]} />
    )

    expect(container.querySelectorAll('svg')).toHaveLength(
      SETTINGS_HUB_ICON_KEYS.length
    )
  })

  it('uses multi-column classes instead of a grid', () => {
    const { container } = render(<SettingsHub groups={groups} />)
    const hub = container.firstElementChild

    expect(hub).toHaveClass('columns-1', 'sm:columns-2', 'lg:columns-3')
    expect(hub).not.toHaveClass('grid')
  })

  it('prevents every card from splitting across columns', () => {
    const { container } = render(<SettingsHub groups={groups} />)

    for (const card of container.querySelectorAll('section'))
      expect(card).toHaveClass('break-inside-avoid')
  })

  it('preserves item order inside each group', () => {
    render(<SettingsHub groups={groups} />)

    const workspace = screen
      .getByRole('heading', { name: 'Workspace' })
      .closest('section')
    expect(
      Array.from(workspace?.querySelectorAll('li') ?? []).map(
        (item) => item.textContent
      )
    ).toEqual(['Teams', 'MembersPlanned'])
  })

  it('preserves group order', () => {
    render(<SettingsHub groups={groups} />)

    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent)
    ).toEqual(['Workspace', 'Requests'])
  })

  it('does not mutate its groups prop', () => {
    const mutableGroups = structuredClone(groups)
    const beforeRender = structuredClone(mutableGroups)

    render(<SettingsHub groups={mutableGroups} />)

    expect(mutableGroups).toEqual(beforeRender)
  })

  it('renders duplicate group labels independently', () => {
    const duplicateGroups: SettingsHubGroup[] = [
      { label: 'Duplicate', items: [] },
      { label: 'Duplicate', items: [] },
    ]

    render(<SettingsHub groups={duplicateGroups} />)

    expect(screen.getAllByRole('heading', { name: 'Duplicate' })).toHaveLength(
      2
    )
  })

  it('renders markup-like group text as text', () => {
    const markupLabel = '<script>alert(1)</script>'

    render(<SettingsHub groups={[{ label: markupLabel, items: [] }]} />)

    expect(
      screen.getByRole('heading', { name: markupLabel })
    ).toHaveTextContent(markupLabel)
    expect(document.querySelector('script')).toBeNull()
  })
})
