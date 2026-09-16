// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  layoutCondition,
  layoutEffect,
  layoutField,
  layoutFixture,
  layoutRule,
  layoutSection,
} from './fixtures'
import { LayoutRenderer } from './layout-renderer'

import type { LayoutFieldDescriptor } from './layout-renderer'
import type { Layout } from './types'

const DESCRIPTORS: LayoutFieldDescriptor[] = [
  { fieldKey: 'title', label: 'Title', control: { kind: 'text' } },
  {
    fieldKey: 'description',
    label: 'Description',
    control: { kind: 'textarea' },
  },
  { fieldKey: 'estimate', label: 'Estimate', control: { kind: 'number' } },
  { fieldKey: 'dueDate', label: 'Due date', control: { kind: 'date' } },
  {
    fieldKey: 'priority',
    label: 'Priority',
    control: {
      kind: 'select',
      options: [
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
      ],
    },
  },
  {
    fieldKey: 'labels',
    label: 'Labels',
    control: {
      kind: 'multi-select',
      options: [
        { value: 'bug', label: 'Bug' },
        { value: 'design', label: 'Design' },
      ],
    },
  },
  { fieldKey: 'flagged', label: 'Flagged', control: { kind: 'boolean' } },
]

const LAYOUT = layoutFixture({
  sections: [
    layoutSection('main', {
      title: 'Details',
      columns: 2,
      fields: [
        layoutField('title', { width: 2 }),
        layoutField('priority'),
        layoutField('estimate'),
      ],
    }),
  ],
})

function layoutWith(
  fields: Layout['sections'][number]['fields'],
  rules: Layout['rules'] = [],
  columns: 1 | 2 = 1
): Layout {
  return layoutFixture({
    sections: [layoutSection('main', { title: 'Details', columns, fields })],
    rules,
  })
}

function renderInForm(
  layout: Layout,
  namePrefix?: string,
  values?: Record<string, string | string[] | null>
) {
  const view = render(
    <form>
      <LayoutRenderer
        layout={layout}
        fields={DESCRIPTORS}
        values={values}
        namePrefix={namePrefix}
      />
    </form>
  )

  const form = view.container.querySelector('form')
  if (!form) throw new Error('Expected a form')

  return { ...view, form }
}

function rowFor(label: string): HTMLElement {
  const row = screen.getByLabelText(label).closest('[data-slot="form-row"]')
  if (!(row instanceof HTMLElement))
    throw new Error(`Expected a form row for ${label}`)

  return row
}

describe('LayoutRenderer', () => {
  afterEach(cleanup)

  describe('structure', () => {
    it('renders one section per layout section', () => {
      const layout = layoutFixture({
        sections: [
          layoutSection('main', {
            title: 'Details',
            fields: [layoutField('title')],
          }),
          layoutSection('more', {
            title: 'Planning',
            fields: [layoutField('dueDate')],
          }),
        ],
      })

      render(<LayoutRenderer layout={layout} fields={DESCRIPTORS} />)

      expect(
        screen.getByRole('heading', { name: 'Details' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Planning' })
      ).toBeInTheDocument()
    })

    it('renders a labelled control for every placed field', () => {
      render(<LayoutRenderer layout={LAYOUT} fields={DESCRIPTORS} />)

      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(screen.getByLabelText('Priority')).toBeInTheDocument()
      expect(screen.getByLabelText('Estimate')).toBeInTheDocument()
    })

    it('keeps the field order the layout authors', () => {
      const { container } = render(
        <LayoutRenderer layout={LAYOUT} fields={DESCRIPTORS} />
      )

      const labels = Array.from(
        container.querySelectorAll('[data-slot="form-row"] > div > label')
      ).map((label) => label.textContent)

      expect(labels).toEqual(['Title', 'Priority', 'Estimate'])
    })

    it('lays a two-column section out in a grid', () => {
      const { container } = render(
        <LayoutRenderer layout={LAYOUT} fields={DESCRIPTORS} />
      )

      const grid = container.querySelector('[data-columns="2"]')

      expect(grid?.classList.contains('sm:grid-cols-2')).toBe(true)
    })

    it('leaves a one-column section in a single column', () => {
      const { container } = render(
        <LayoutRenderer
          layout={layoutWith([layoutField('title')])}
          fields={DESCRIPTORS}
        />
      )

      const grid = container.querySelector('[data-columns="1"]')

      expect(grid?.classList.contains('sm:grid-cols-2')).toBe(false)
    })

    it('spans a width-2 field across both columns', () => {
      render(<LayoutRenderer layout={LAYOUT} fields={DESCRIPTORS} />)

      expect(rowFor('Title').classList.contains('sm:col-span-2')).toBe(true)
    })

    it('keeps a width-1 field in one column', () => {
      render(<LayoutRenderer layout={LAYOUT} fields={DESCRIPTORS} />)

      expect(rowFor('Priority').classList.contains('sm:col-span-2')).toBe(false)
    })

    it('skips a placed field the host supplies no control for', () => {
      const { container } = render(
        <LayoutRenderer
          layout={layoutWith([layoutField('title'), layoutField('mystery')])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Title')).toBeInTheDocument()
      expect(container.querySelectorAll('[data-slot="form-row"]')).toHaveLength(
        1
      )
    })

    it('skips a control the layout does not place', () => {
      render(<LayoutRenderer layout={LAYOUT} fields={DESCRIPTORS} />)

      expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()
    })
  })

  describe('visibility', () => {
    it('hides a field the layout authors hidden', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([
            layoutField('title'),
            layoutField('dueDate', { visible: false }),
          ])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument()
    })

    it('reveals an authored-hidden field once its show rule fires', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [
              layoutField('priority'),
              layoutField('dueDate', { visible: false }),
            ],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'high')],
                then: [layoutEffect('dueDate', 'show')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'high' },
      })

      expect(screen.getByLabelText('Due date')).toBeInTheDocument()
    })

    it('hides a field once its hide rule fires', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('priority'), layoutField('dueDate')],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'high')],
                then: [layoutEffect('dueDate', 'hide')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'high' },
      })

      expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument()
    })

    it('hides the field again when the revealing value changes', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [
              layoutField('priority'),
              layoutField('dueDate', { visible: false }),
            ],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'high')],
                then: [layoutEffect('dueDate', 'show')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'high' },
      })
      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'low' },
      })

      expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument()
    })

    it('re-evaluates its rules when a multi-select changes', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('labels'), layoutField('dueDate', { visible: false })],
            [
              layoutRule('r1', {
                when: [layoutCondition('labels', 'is-not-empty')],
                then: [layoutEffect('dueDate', 'show')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      fireEvent.click(screen.getByRole('checkbox', { name: 'Bug' }))

      expect(screen.getByLabelText('Due date')).toBeInTheDocument()
    })

    it('never renders a field whose require rule targets a hidden field', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('dueDate', { visible: false })],
            [
              layoutRule('r1', {
                when: [],
                then: [layoutEffect('dueDate', 'require')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.queryByLabelText('Due date')).not.toBeInTheDocument()
    })
  })

  describe('required and disabled', () => {
    it('leaves a field optional while its require rule does not apply', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('priority'), layoutField('dueDate')],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'high')],
                then: [layoutEffect('dueDate', 'require')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Due date')).not.toBeRequired()
    })

    it('requires a field once its require rule applies', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('priority'), layoutField('dueDate')],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'high')],
                then: [layoutEffect('dueDate', 'require')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'high' },
      })

      expect(screen.getByLabelText('Due date')).toBeRequired()
    })

    it('marks a required field on its label', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('dueDate')],
            [
              layoutRule('r1', {
                when: [],
                then: [layoutEffect('dueDate', 'require')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      expect(within(rowFor('Due date')).getByText('*')).toBeInTheDocument()
    })

    it('disables a field once its disable rule applies', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('priority'), layoutField('title')],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'low')],
                then: [layoutEffect('title', 'disable')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'low' },
      })

      expect(screen.getByLabelText('Title')).toBeDisabled()
    })

    it('leaves a field enabled while its disable rule does not apply', () => {
      render(
        <LayoutRenderer
          layout={layoutWith(
            [layoutField('priority'), layoutField('title')],
            [
              layoutRule('r1', {
                when: [layoutCondition('priority', 'equals', 'low')],
                then: [layoutEffect('title', 'disable')],
              }),
            ]
          )}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Title')).toBeEnabled()
    })
  })

  describe('controls', () => {
    it('starts its controls from the values it is given', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('title'), layoutField('dueDate')])}
          fields={DESCRIPTORS}
          values={{ title: 'Seeded', dueDate: '2026-10-01' }}
        />
      )

      expect(screen.getByLabelText('Title')).toHaveValue('Seeded')
      expect(screen.getByLabelText('Due date')).toHaveValue('2026-10-01')
    })

    it('starts empty without values', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('title')])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Title')).toHaveValue('')
    })

    it('renders a textarea for the textarea kind', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('description')])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Description').tagName).toBe('TEXTAREA')
    })

    it('renders a number input for the number kind', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('estimate')])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Estimate')).toHaveAttribute(
        'type',
        'number'
      )
    })

    it('renders a date input for the date kind', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('dueDate')])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getByLabelText('Due date')).toHaveAttribute('type', 'date')
    })

    it('renders one option per select value', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('priority')])}
          fields={DESCRIPTORS}
        />
      )

      const select = screen.getByLabelText('Priority')

      expect(within(select).getAllByRole('option')).toHaveLength(3)
      expect(
        within(select).getByRole('option', { name: 'High' })
      ).toBeInTheDocument()
    })

    it('renders one checkbox per multi-select option', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('labels')])}
          fields={DESCRIPTORS}
        />
      )

      expect(screen.getAllByRole('checkbox')).toHaveLength(2)
      expect(screen.getByRole('checkbox', { name: 'Bug' })).not.toBeChecked()
    })

    it('checks the multi-select options it is given', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('labels')])}
          fields={DESCRIPTORS}
          values={{ labels: ['design'] }}
        />
      )

      expect(screen.getByRole('checkbox', { name: 'Design' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Bug' })).not.toBeChecked()
    })

    it('unchecks a multi-select option that is clicked twice', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('labels')])}
          fields={DESCRIPTORS}
          values={{ labels: ['bug'] }}
        />
      )

      fireEvent.click(screen.getByRole('checkbox', { name: 'Bug' }))

      expect(screen.getByRole('checkbox', { name: 'Bug' })).not.toBeChecked()
    })

    it('checks a boolean from a submitted value', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('flagged')])}
          fields={DESCRIPTORS}
          values={{ flagged: 'true' }}
        />
      )

      expect(screen.getByRole('checkbox', { name: 'Flagged' })).toBeChecked()
    })

    it('leaves a boolean unchecked without a submitted value', () => {
      render(
        <LayoutRenderer
          layout={layoutWith([layoutField('flagged')])}
          fields={DESCRIPTORS}
        />
      )

      expect(
        screen.getByRole('checkbox', { name: 'Flagged' })
      ).not.toBeChecked()
    })
  })

  describe('form submission', () => {
    it('submits a text value typed into the form', () => {
      const { form } = renderInForm(layoutWith([layoutField('title')]))

      fireEvent.change(screen.getByLabelText('Title'), {
        target: { value: 'Draft the brief' },
      })

      expect(new FormData(form).get('title')).toBe('Draft the brief')
    })

    it('submits the values it was seeded with', () => {
      const { form } = renderInForm(
        layoutWith([layoutField('title'), layoutField('estimate')]),
        undefined,
        { title: 'Ship it', estimate: '3' }
      )

      const data = new FormData(form)

      expect(data.get('title')).toBe('Ship it')
      expect(data.get('estimate')).toBe('3')
    })

    it('prefixes every submitted name', () => {
      const { form } = renderInForm(layoutWith([layoutField('title')]), 'item_')

      const data = new FormData(form)

      expect(data.get('item_title')).toBe('')
      expect(data.get('title')).toBeNull()
    })

    it('submits the option chosen in a select', () => {
      const { form } = renderInForm(layoutWith([layoutField('priority')]))

      fireEvent.change(screen.getByLabelText('Priority'), {
        target: { value: 'high' },
      })

      expect(new FormData(form).get('priority')).toBe('high')
    })

    it('submits every selected multi-select value under one name', () => {
      const { form } = renderInForm(layoutWith([layoutField('labels')]))

      fireEvent.click(screen.getByRole('checkbox', { name: 'Bug' }))
      fireEvent.click(screen.getByRole('checkbox', { name: 'Design' }))

      expect(new FormData(form).getAll('labels')).toEqual(['bug', 'design'])
    })

    it('drops a multi-select value that is unchecked again', () => {
      const { form } = renderInForm(
        layoutWith([layoutField('labels')]),
        undefined,
        {
          labels: ['bug', 'design'],
        }
      )

      fireEvent.click(screen.getByRole('checkbox', { name: 'Design' }))

      expect(new FormData(form).getAll('labels')).toEqual(['bug'])
    })

    it('submits true for a checked boolean', () => {
      const { form } = renderInForm(layoutWith([layoutField('flagged')]))

      fireEvent.click(screen.getByRole('checkbox', { name: 'Flagged' }))

      expect(new FormData(form).get('flagged')).toBe('true')
    })

    it('submits false for an unchecked boolean', () => {
      const { form } = renderInForm(
        layoutWith([layoutField('flagged')]),
        undefined,
        { flagged: 'true' }
      )

      fireEvent.click(screen.getByRole('checkbox', { name: 'Flagged' }))

      expect(new FormData(form).get('flagged')).toBe('false')
    })

    it('leaves hidden fields out of the submission', () => {
      const { form } = renderInForm(
        layoutWith([layoutField('dueDate', { visible: false })]),
        undefined,
        { dueDate: '2026-10-01' }
      )

      expect(new FormData(form).get('dueDate')).toBeNull()
    })

    it('leaves disabled fields out of the submission', () => {
      const { form } = renderInForm(
        layoutWith(
          [layoutField('title')],
          [
            layoutRule('r1', {
              when: [],
              then: [layoutEffect('title', 'disable')],
            }),
          ]
        ),
        undefined,
        { title: 'Locked' }
      )

      expect(new FormData(form).get('title')).toBeNull()
    })
  })
})
