import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/lib/client', () => ({
  workItemTypesClient: { create: vi.fn(), delete: vi.fn() },
  workflowStatesClient: { create: vi.fn(), delete: vi.fn() },
  milestonesClient: { create: vi.fn(), delete: vi.fn() },
  customFieldsClient: { create: vi.fn(), delete: vi.fn() },
}))

import { WorkStructureSettings } from './work-structure-settings'

describe('WorkStructureSettings', () => {
  it('renders an explicit empty state for work item types', () => {
    render(<WorkStructureSettings kind="work-item-types" items={[]} />)

    expect(screen.getByText('No work item types yet.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('renders a populated work item type with its key', () => {
    render(
      <WorkStructureSettings
        kind="work-item-types"
        items={[
          {
            object: 'projects.work-item-type',
            id: 'type_1',
            tenantId: 'tenant_1',
            key: 'bug',
            name: 'Bug',
            iconKey: 'bug',
            color: '#ef4444',
            hierarchyLevel: 1,
            description: null,
            isDefault: false,
            position: 0,
            archivedAt: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
      />
    )

    expect(screen.getByText('Bug')).toBeVisible()
    expect(screen.getByText('bug')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled()
  })
})
