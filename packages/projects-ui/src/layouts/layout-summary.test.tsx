// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  layoutCondition,
  layoutEffect,
  layoutField,
  layoutFixture,
  layoutRule,
  layoutSection,
} from './fixtures'
import { LayoutSummary } from './layout-summary'

const LAYOUT = layoutFixture({
  name: 'Work item default',
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
    layoutRule('rule-2', {
      when: [
        layoutCondition('priority', 'equals', 'high'),
        layoutCondition('labels', 'is-not-empty'),
      ],
      then: [
        layoutEffect('dueDate', 'show'),
        layoutEffect('estimate', 'require'),
      ],
    }),
    layoutRule('rule-3', { when: [], then: [] }),
  ],
})

const FIELD_LABELS = {
  title: 'Title',
  priority: 'Priority',
  dueDate: 'Due date',
  state: 'State',
  labels: 'Labels',
  estimate: 'Estimate',
}

function fieldTexts(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="layout-summary-field"]')
  ).map((field) => field.textContent ?? '')
}

describe('LayoutSummary', () => {
  afterEach(cleanup)

  it('names the layout and the entity it belongs to', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(screen.getByText('Work item default')).toBeInTheDocument()
    expect(screen.getByText('work-item · Default')).toBeInTheDocument()
  })

  it('marks a built-in layout', () => {
    render(
      <LayoutSummary
        layout={layoutFixture({
          entity: 'project',
          isDefault: false,
          builtIn: true,
        })}
      />
    )

    expect(screen.getByText('project · Built-in')).toBeInTheDocument()
  })

  it('lists each section with its column count', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(screen.getByText('Basics')).toBeInTheDocument()
    expect(screen.getByText('1 column')).toBeInTheDocument()
    expect(screen.getByText('Planning')).toBeInTheDocument()
    expect(screen.getByText('2 columns')).toBeInTheDocument()
  })

  it('lists the placed fields in layout order', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(fieldTexts()).toEqual([
      'TitleSpans 1 column',
      'PrioritySpans 1 column',
      'Due dateSpans 2 columnsHidden',
    ])
  })

  it('falls back to the field key when it has no label', () => {
    render(<LayoutSummary layout={LAYOUT} />)

    expect(fieldTexts()[0]).toContain('title')
    expect(fieldTexts()[2]).toContain('dueDate')
  })

  it('marks hidden fields and full-width fields', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(screen.getByText('Hidden')).toBeInTheDocument()
    expect(screen.getByText('Spans 2 columns')).toBeInTheDocument()
  })

  it('describes what a rule watches and what it does', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(screen.getByText('rule-1')).toBeInTheDocument()
    expect(screen.getByText('when State equals done')).toBeInTheDocument()
    expect(screen.getByText('then Disable Due date')).toBeInTheDocument()
  })

  it('joins conditions with and', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(
      screen.getByText('when Priority equals high and Labels is not empty')
    ).toBeInTheDocument()
  })

  it('joins effects with a comma', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(
      screen.getByText('then Show Due date, Require Estimate')
    ).toBeInTheDocument()
  })

  it('says a rule without conditions always applies', () => {
    render(<LayoutSummary layout={LAYOUT} fieldLabels={FIELD_LABELS} />)

    expect(screen.getByText('always')).toBeInTheDocument()
    expect(screen.getByText('nothing')).toBeInTheDocument()
  })

  it('renders list conditions with every value', () => {
    render(
      <LayoutSummary
        layout={layoutFixture({
          rules: [
            layoutRule('rule-1', {
              when: [layoutCondition('state', 'in', ['started', 'blocked'])],
              then: [layoutEffect('state', 'hide')],
            }),
          ],
        })}
        fieldLabels={FIELD_LABELS}
      />
    )

    expect(
      screen.getByText('when State is one of started, blocked')
    ).toBeInTheDocument()
  })

  it('renders emptiness conditions without a value', () => {
    render(
      <LayoutSummary
        layout={layoutFixture({
          rules: [
            layoutRule('rule-1', {
              when: [layoutCondition('dueDate', 'is-empty')],
              then: [layoutEffect('dueDate', 'require')],
            }),
          ],
        })}
        fieldLabels={FIELD_LABELS}
      />
    )

    expect(screen.getByText('when Due date is empty')).toBeInTheDocument()
  })

  it('says so when the layout has neither sections nor rules', () => {
    render(<LayoutSummary layout={layoutFixture({ isDefault: false })} />)

    expect(screen.getByText('No sections.')).toBeInTheDocument()
    expect(screen.getByText('No rules.')).toBeInTheDocument()
  })
})
