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
import { LayoutEditor } from './layout-editor'

import type { Layout, LayoutRule, LayoutSection } from './types'

type LayoutDefinition = { sections: LayoutSection[]; rules: LayoutRule[] }

const AVAILABLE_FIELDS = [
  { fieldKey: 'title', label: 'Title' },
  { fieldKey: 'priority', label: 'Priority' },
  { fieldKey: 'dueDate', label: 'Due date' },
  { fieldKey: 'state', label: 'State' },
]

const INITIAL = layoutFixture({
  sections: [
    layoutSection('basics', {
      title: 'Basics',
      fields: [layoutField('title'), layoutField('priority')],
    }),
    layoutSection('planning', {
      title: 'Planning',
      columns: 2,
      fields: [layoutField('dueDate', { visible: false, width: 2 })],
    }),
  ],
  rules: [
    layoutRule('rule-1', {
      when: [layoutCondition('state', 'equals', 'done')],
      then: [layoutEffect('dueDate', 'disable')],
    }),
  ],
})

function sectionBlocks(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="layout-editor-section"]'
    )
  )
}

function ruleBlocks(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="layout-editor-rule"]')
  )
}

function fieldRows(block: HTMLElement): HTMLElement[] {
  return Array.from(
    block.querySelectorAll<HTMLElement>('[data-slot="layout-editor-field"]')
  )
}

function fieldRow(block: HTMLElement, label: string): HTMLElement {
  const row = fieldRows(block).find(
    (candidate) => within(candidate).queryByText(label) !== null
  )
  if (!row) throw new Error(`Expected a field row for ${label}`)

  return row
}

function sectionHeader(block: HTMLElement): HTMLElement {
  const header = block.querySelector(
    '[data-slot="layout-editor-section-header"]'
  )
  if (!(header instanceof HTMLElement))
    throw new Error('Expected a section header')

  return header
}

function ruleHeader(): HTMLElement {
  const header = ruleBlocks()[0]?.querySelector(
    '[data-slot="layout-editor-rule-header"]'
  )
  if (!(header instanceof HTMLElement))
    throw new Error('Expected a rule header')

  return header
}

function conditionRow(index: number): HTMLElement {
  const row = ruleBlocks()[0]?.querySelectorAll(
    '[data-slot="layout-editor-condition"]'
  )[index]
  if (!(row instanceof HTMLElement)) throw new Error('Expected a condition row')

  return row
}

function effectRow(index: number): HTMLElement {
  const row = ruleBlocks()[0]?.querySelectorAll(
    '[data-slot="layout-editor-effect"]'
  )[index]
  if (!(row instanceof HTMLElement)) throw new Error('Expected an effect row')

  return row
}

function definitionFrom(container: HTMLElement): LayoutDefinition {
  const input = container.querySelector<HTMLInputElement>(
    'input[name="definition"]'
  )
  if (!input) throw new Error('Expected a definition input')

  return JSON.parse(input.value) as LayoutDefinition
}

function definitionInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    'input[name="definition"]'
  )
  if (!input) throw new Error('Expected a definition input')

  return input
}

function renderEditor(initial: Layout = INITIAL) {
  const view = render(
    <LayoutEditor initial={initial} availableFields={AVAILABLE_FIELDS} />
  )

  return { ...view, definition: () => definitionFrom(view.container) }
}

describe('LayoutEditor', () => {
  afterEach(cleanup)

  describe('structure', () => {
    it('renders one block per section', () => {
      renderEditor()

      expect(sectionBlocks()).toHaveLength(2)
    })

    it('renders one row per placed field', () => {
      renderEditor()

      const [basics] = sectionBlocks()

      expect(fieldRows(basics)).toHaveLength(2)
      expect(within(basics).getByText('Title')).toBeInTheDocument()
      expect(within(basics).getByText('Priority')).toBeInTheDocument()
    })

    it('shows each section title in an editable input', () => {
      renderEditor()

      expect(screen.getAllByLabelText('Section title')[0]).toHaveValue('Basics')
      expect(screen.getAllByLabelText('Section title')[1]).toHaveValue(
        'Planning'
      )
    })

    it('renders one block per rule', () => {
      renderEditor()

      expect(ruleBlocks()).toHaveLength(1)
      expect(screen.getByText('rule-1')).toBeInTheDocument()
    })

    it('says so when the layout has neither sections nor rules', () => {
      renderEditor(layoutFixture())

      expect(screen.getByText('No sections yet.')).toBeInTheDocument()
      expect(screen.getByText('No rules yet.')).toBeInTheDocument()
    })
  })

  describe('sections', () => {
    it('renames a section', () => {
      const { definition } = renderEditor()

      fireEvent.change(screen.getAllByLabelText('Section title')[0], {
        target: { value: 'Overview' },
      })

      expect(definition().sections[0].title).toBe('Overview')
    })

    it('adds an empty section', () => {
      const { definition } = renderEditor()

      fireEvent.click(screen.getByRole('button', { name: 'Add section' }))

      expect(sectionBlocks()).toHaveLength(3)
      expect(definition().sections).toHaveLength(3)
      expect(definition().sections[2]).toEqual({
        key: 'section-3',
        title: 'Section 3',
        columns: 1,
        fields: [],
      })
    })

    it('removes a section', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(sectionHeader(sectionBlocks()[0])).getByRole('button', {
          name: 'Remove',
        })
      )

      expect(definition().sections.map((section) => section.key)).toEqual([
        'planning',
      ])
    })

    it('moves a section down', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(sectionHeader(sectionBlocks()[0])).getByRole('button', {
          name: 'Move down',
        })
      )

      expect(definition().sections.map((section) => section.key)).toEqual([
        'planning',
        'basics',
      ])
    })

    it('moves a section up', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(sectionHeader(sectionBlocks()[1])).getByRole('button', {
          name: 'Move up',
        })
      )

      expect(definition().sections.map((section) => section.key)).toEqual([
        'planning',
        'basics',
      ])
    })

    it('disables the section moves that would leave the list', () => {
      renderEditor()

      expect(
        within(sectionHeader(sectionBlocks()[0])).getByRole('button', {
          name: 'Move up',
        })
      ).toBeDisabled()
      expect(
        within(sectionHeader(sectionBlocks()[0])).getByRole('button', {
          name: 'Move down',
        })
      ).toBeEnabled()
      expect(
        within(sectionHeader(sectionBlocks()[1])).getByRole('button', {
          name: 'Move down',
        })
      ).toBeDisabled()
    })
  })

  describe('fields', () => {
    it('adds an available field to a section', () => {
      const { definition } = renderEditor()

      fireEvent.change(within(sectionBlocks()[0]).getByLabelText('Add field'), {
        target: { value: 'state' },
      })
      fireEvent.click(
        within(sectionBlocks()[0]).getByRole('button', { name: 'Add field' })
      )

      expect(
        definition().sections[0].fields.map((field) => field.fieldKey)
      ).toEqual(['title', 'priority', 'state'])
      expect(definition().sections[0].fields[2]).toEqual({
        fieldKey: 'state',
        width: 1,
        visible: true,
      })
    })

    it('drops an added field from the picker so it cannot be added twice', () => {
      renderEditor()

      fireEvent.change(within(sectionBlocks()[0]).getByLabelText('Add field'), {
        target: { value: 'state' },
      })
      fireEvent.click(
        within(sectionBlocks()[0]).getByRole('button', { name: 'Add field' })
      )

      expect(
        within(sectionBlocks()[0]).queryByRole('option', { name: 'State' })
      ).not.toBeInTheDocument()
      expect(
        within(sectionBlocks()[0]).getByRole('button', { name: 'Add field' })
      ).toBeDisabled()
    })

    it('only offers fields the layout does not already place', () => {
      renderEditor()

      expect(
        within(sectionBlocks()[0]).queryByRole('option', { name: 'Title' })
      ).not.toBeInTheDocument()
      expect(
        within(sectionBlocks()[0]).getByRole('option', { name: 'State' })
      ).toBeInTheDocument()
    })

    it('removes a field', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(fieldRow(sectionBlocks()[0], 'Priority')).getByRole('button', {
          name: 'Remove',
        })
      )

      expect(
        definition().sections[0].fields.map((field) => field.fieldKey)
      ).toEqual(['title'])
    })

    it('moves a field to another section', () => {
      const { definition } = renderEditor()

      fireEvent.change(
        within(fieldRow(sectionBlocks()[0], 'Title')).getByLabelText('Section'),
        { target: { value: 'planning' } }
      )

      expect(
        definition().sections[0].fields.map((field) => field.fieldKey)
      ).toEqual(['priority'])
      expect(
        definition().sections[1].fields.map((field) => field.fieldKey)
      ).toEqual(['dueDate', 'title'])
    })

    it('moves a field up within its section', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(fieldRow(sectionBlocks()[0], 'Priority')).getByRole('button', {
          name: 'Move up',
        })
      )

      expect(
        definition().sections[0].fields.map((field) => field.fieldKey)
      ).toEqual(['priority', 'title'])
    })

    it('moves a field down within its section', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(fieldRow(sectionBlocks()[0], 'Title')).getByRole('button', {
          name: 'Move down',
        })
      )

      expect(
        definition().sections[0].fields.map((field) => field.fieldKey)
      ).toEqual(['priority', 'title'])
    })

    it('disables the field moves that would leave the section', () => {
      renderEditor()

      expect(
        within(fieldRow(sectionBlocks()[0], 'Title')).getByRole('button', {
          name: 'Move up',
        })
      ).toBeDisabled()
      expect(
        within(fieldRow(sectionBlocks()[0], 'Priority')).getByRole('button', {
          name: 'Move down',
        })
      ).toBeDisabled()
    })

    it('hides a field by unchecking its visibility', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(fieldRow(sectionBlocks()[0], 'Title')).getByRole('checkbox', {
          name: 'Visible',
        })
      )

      expect(definition().sections[0].fields[0].visible).toBe(false)
    })

    it('starts a field hidden when the layout says so', () => {
      renderEditor()

      expect(
        within(fieldRow(sectionBlocks()[1], 'Due date')).getByRole('checkbox', {
          name: 'Visible',
        })
      ).not.toBeChecked()
    })

    it('widens a field to fill both columns', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(fieldRow(sectionBlocks()[0], 'Priority')).getByRole('checkbox', {
          name: 'Full width',
        })
      )

      expect(definition().sections[0].fields[1].width).toBe(2)
    })

    it('narrows a field back to one column', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(fieldRow(sectionBlocks()[1], 'Due date')).getByRole('checkbox', {
          name: 'Full width',
        })
      )

      expect(definition().sections[1].fields[0].width).toBe(1)
    })
  })

  describe('rules', () => {
    it('adds a rule with one condition and one effect', () => {
      const { definition } = renderEditor()

      fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

      expect(ruleBlocks()).toHaveLength(2)
      expect(definition().rules[1]).toEqual({
        key: 'rule-2',
        when: [{ fieldKey: 'title', op: 'equals', value: '' }],
        then: [{ fieldKey: 'title', effect: 'show' }],
      })
    })

    it('removes a rule', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(ruleHeader()).getByRole('button', { name: 'Remove' })
      )

      expect(definition().rules).toEqual([])
    })

    it('adds a condition row', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(ruleBlocks()[0]).getByRole('button', { name: 'Add condition' })
      )

      expect(definition().rules[0].when).toHaveLength(2)
    })

    it('removes a condition row', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(conditionRow(0)).getByRole('button', { name: 'Remove' })
      )

      expect(definition().rules[0].when).toEqual([])
    })

    it('changes the field a condition watches', () => {
      const { definition } = renderEditor()

      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Condition field 1'),
        {
          target: { value: 'priority' },
        }
      )

      expect(definition().rules[0].when[0].fieldKey).toBe('priority')
    })

    it('changes the value a condition compares against', () => {
      const { definition } = renderEditor()

      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Condition value 1'),
        {
          target: { value: 'started' },
        }
      )

      expect(definition().rules[0].when[0]).toEqual({
        fieldKey: 'state',
        op: 'equals',
        value: 'started',
      })
    })

    it('splits a list condition into an array of values', () => {
      const { definition } = renderEditor()

      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Condition operator 1'),
        { target: { value: 'in' } }
      )
      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Condition value 1'),
        {
          target: { value: 'started, blocked' },
        }
      )

      expect(definition().rules[0].when[0]).toEqual({
        fieldKey: 'state',
        op: 'in',
        value: ['started', 'blocked'],
      })
    })

    it('drops the value of a condition that only checks emptiness', () => {
      const { definition } = renderEditor()

      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Condition operator 1'),
        { target: { value: 'is-empty' } }
      )

      expect(definition().rules[0].when[0]).toEqual({
        fieldKey: 'state',
        op: 'is-empty',
      })
    })

    it('hides the value input for a condition that checks emptiness', () => {
      renderEditor()

      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Condition operator 1'),
        { target: { value: 'is-not-empty' } }
      )

      expect(
        within(ruleBlocks()[0]).queryByLabelText('Condition value 1')
      ).not.toBeInTheDocument()
    })

    it('keeps the value while switching the operator back and forth', () => {
      const { definition } = renderEditor()

      const operator = within(ruleBlocks()[0]).getByLabelText(
        'Condition operator 1'
      )

      fireEvent.change(operator, { target: { value: 'is-empty' } })
      fireEvent.change(operator, { target: { value: 'equals' } })

      expect(definition().rules[0].when[0]).toEqual({
        fieldKey: 'state',
        op: 'equals',
        value: 'done',
      })
    })

    it('reads a list condition back into its input', () => {
      renderEditor(
        layoutFixture({
          rules: [
            layoutRule('rule-1', {
              when: [layoutCondition('state', 'in', ['started', 'blocked'])],
              then: [layoutEffect('dueDate', 'show')],
            }),
          ],
        })
      )

      expect(
        within(ruleBlocks()[0]).getByLabelText('Condition value 1')
      ).toHaveValue('started, blocked')
    })

    it('adds an effect row', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(ruleBlocks()[0]).getByRole('button', { name: 'Add effect' })
      )

      expect(definition().rules[0].then).toHaveLength(2)
    })

    it('removes an effect row', () => {
      const { definition } = renderEditor()

      fireEvent.click(
        within(effectRow(0)).getByRole('button', { name: 'Remove' })
      )

      expect(definition().rules[0].then).toEqual([])
    })

    it('changes the effect a rule applies', () => {
      const { definition } = renderEditor()

      fireEvent.change(within(ruleBlocks()[0]).getByLabelText('Effect 1'), {
        target: { value: 'hide' },
      })

      expect(definition().rules[0].then[0]).toEqual({
        fieldKey: 'dueDate',
        effect: 'hide',
      })
    })

    it('changes the field an effect targets', () => {
      const { definition } = renderEditor()

      fireEvent.change(
        within(ruleBlocks()[0]).getByLabelText('Effect field 1'),
        {
          target: { value: 'title' },
        }
      )

      expect(definition().rules[0].then[0]).toEqual({
        fieldKey: 'title',
        effect: 'disable',
      })
    })

    it('keeps rule keys unique when the list is not empty', () => {
      const { definition } = renderEditor(
        layoutFixture({
          rules: [layoutRule('rule-2', { when: [], then: [] })],
        })
      )

      fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

      expect(definition().rules.map((rule) => rule.key)).toEqual([
        'rule-2',
        'rule-3',
      ])
    })
  })

  describe('serialized definition', () => {
    it('posts the definition as a hidden field', () => {
      const { container } = renderEditor()

      const input = definitionInput(container)

      expect(input).toHaveAttribute('type', 'hidden')
      expect(input).toHaveAttribute('name', 'definition')
    })

    it('serializes the layout it was given', () => {
      const { definition } = renderEditor()

      expect(definition()).toEqual({
        sections: INITIAL.sections,
        rules: INITIAL.rules,
      })
    })

    it('serializes every edit it has taken', () => {
      const { definition } = renderEditor()

      fireEvent.change(screen.getAllByLabelText('Section title')[0], {
        target: { value: 'Overview' },
      })
      fireEvent.click(
        within(fieldRow(sectionBlocks()[0], 'Title')).getByRole('checkbox', {
          name: 'Visible',
        })
      )
      fireEvent.click(
        within(ruleHeader()).getByRole('button', { name: 'Remove' })
      )

      expect(definition()).toEqual({
        sections: [
          {
            key: 'basics',
            title: 'Overview',
            columns: 1,
            fields: [
              { fieldKey: 'title', width: 1, visible: false },
              { fieldKey: 'priority', width: 1, visible: true },
            ],
          },
          INITIAL.sections[1],
        ],
        rules: [],
      })
    })

    it('submits the definition through a surrounding form', () => {
      const { container } = render(
        <form>
          <LayoutEditor initial={INITIAL} availableFields={AVAILABLE_FIELDS} />
        </form>
      )

      const form = container.querySelector('form')
      if (!form) throw new Error('Expected a form')

      const posted = new FormData(form).get('definition')
      if (typeof posted !== 'string') throw new Error('Expected a definition')

      expect(JSON.parse(posted)).toEqual({
        sections: INITIAL.sections,
        rules: INITIAL.rules,
      })
    })

    it('submits the definition after an edit', () => {
      const { container } = render(
        <form>
          <LayoutEditor initial={INITIAL} availableFields={AVAILABLE_FIELDS} />
        </form>
      )

      const form = container.querySelector('form')
      if (!form) throw new Error('Expected a form')

      fireEvent.click(screen.getByRole('button', { name: 'Add section' }))

      const posted = new FormData(form).get('definition')
      if (typeof posted !== 'string') throw new Error('Expected a definition')

      expect((JSON.parse(posted) as LayoutDefinition).sections).toHaveLength(3)
    })
  })
})
