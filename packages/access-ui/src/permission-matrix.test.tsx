import '@testing-library/jest-dom/vitest'

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  matrixModulesFromCatalog,
  PermissionMatrix,
  type PermissionMatrixModule,
} from './permission-matrix'

const modules: PermissionMatrixModule[] = [
  {
    key: 'reports',
    label: 'Reports',
    permissions: [
      { key: 'reports.view', label: 'View reports' },
      { key: 'reports.delete', label: 'Delete reports', isDangerous: true },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    permissions: [{ key: 'settings.edit', label: 'Edit settings' }],
  },
]

function renderMatrix(
  props: Partial<React.ComponentProps<typeof PermissionMatrix>> = {}
) {
  return render(
    <PermissionMatrix modules={modules} held={['reports.view']} {...props} />
  )
}

function open(label: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
}

describe('PermissionMatrix', () => {
  it('renders one accordion item per module', () => {
    renderMatrix()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('shows correct granted and total counts', () => {
    renderMatrix()
    expect(screen.getByText('1/2')).toBeVisible()
    expect(screen.getByText('0/1')).toBeVisible()
  })

  it('distinguishes held pills', () => {
    renderMatrix()
    open('Reports')
    expect(screen.getByTitle('reports.view')).toHaveClass('bg-background')
  })

  it('distinguishes not-held pills', () => {
    renderMatrix()
    open('Reports')
    expect(screen.getByTitle('reports.delete')).toHaveClass('line-through')
  })

  it('exposes raw keys through title attributes', () => {
    renderMatrix()
    open('Reports')
    expect(screen.getByTitle('reports.view')).toBeVisible()
    expect(screen.getByTitle('reports.delete')).toBeVisible()
  })

  it('preserves module order', () => {
    renderMatrix()
    expect(
      screen.getAllByRole('button').map((item) => item.textContent)
    ).toEqual(expect.arrayContaining(['Reports1/2', 'Settings0/1']))
  })

  it('preserves permission order', () => {
    renderMatrix()
    open('Reports')
    expect(screen.getAllByTitle(/reports\./).map((item) => item.title)).toEqual(
      ['reports.view', 'reports.delete']
    )
  })

  it('renders unknown module keys with a fallback', () => {
    expect(() =>
      render(
        <PermissionMatrix
          modules={[{ ...modules[0], key: 'unknown' }]}
          held={[]}
        />
      )
    ).not.toThrow()
  })

  it('renders its default empty label', () => {
    render(<PermissionMatrix modules={[]} held={[]} />)
    expect(screen.getByText('No permissions are defined.')).toBeVisible()
  })

  it('renders a supplied empty label', () => {
    render(
      <PermissionMatrix modules={[]} held={[]} emptyLabel="Nothing here" />
    )
    expect(screen.getByText('Nothing here')).toBeVisible()
  })

  it('ignores held keys absent from the catalog', () => {
    renderMatrix({ held: ['obsolete.permission'] })
    open('Reports')
    expect(screen.queryByTitle('obsolete.permission')).not.toBeInTheDocument()
  })

  it('counts duplicate held keys once', () => {
    renderMatrix({ held: ['reports.view', 'reports.view'] })
    expect(screen.getByText('1/2')).toBeVisible()
  })

  it('marks dangerous permissions', () => {
    renderMatrix()
    open('Reports')
    expect(screen.getByLabelText('Dangerous permission')).toBeVisible()
  })

  it('does not render green or emerald utility classes', () => {
    const { container } = renderMatrix()
    expect(container.innerHTML).not.toMatch(/bg-green|text-green|emerald/)
  })

  it('adapts module labels from the catalog', () => {
    const catalog = {
      app: '876-test',
      permissions: [],
      modules: [
        {
          key: 'reports',
          label: 'Reporting center',
          position: 0,
          permissions: [
            {
              key: 'reports.view',
              moduleKey: 'reports',
              action: 'view',
              label: 'Read reports',
              position: 0,
            },
          ],
        },
      ],
    }
    expect(matrixModulesFromCatalog(catalog)).toMatchObject([
      { label: 'Reporting center' },
    ])
  })

  it('preserves catalog module and permission order', () => {
    const catalog = {
      app: '876-test',
      permissions: [],
      modules: [
        {
          key: 'z',
          label: 'Z',
          position: 0,
          permissions: [
            {
              key: 'z.one',
              moduleKey: 'z',
              action: 'one',
              label: 'One',
              position: 0,
            },
            {
              key: 'z.two',
              moduleKey: 'z',
              action: 'two',
              label: 'Two',
              position: 1,
            },
          ],
        },
        { key: 'a', label: 'A', position: 1, permissions: [] },
      ],
    }
    expect(
      matrixModulesFromCatalog(catalog).map((module) => [
        module.key,
        module.permissions.map((permission) => permission.key),
      ])
    ).toEqual([
      ['z', ['z.one', 'z.two']],
      ['a', []],
    ])
  })

  it('returns no matrix modules for an empty catalog', () => {
    expect(
      matrixModulesFromCatalog({
        app: '876-test',
        permissions: [],
        modules: [],
      })
    ).toEqual([])
  })

  it('renders hostile-looking labels as text', () => {
    render(
      <PermissionMatrix
        modules={[
          {
            key: 'reports',
            label: '<img src=x>',
            permissions: [
              { key: 'reports.view', label: '<script>alert(1)</script>' },
            ],
          },
        ]}
        held={['reports.view']}
      />
    )
    expect(screen.getByText('<img src=x>')).toBeVisible()
    open('<img')
    expect(screen.getByText('<script>alert(1)</script>')).toBeVisible()
  })
})
