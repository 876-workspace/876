import { describe, expect, it } from 'vitest'

import {
  evaluateLayoutRules,
  LAYOUT_SYSTEM_FIELD_KEYS,
  toLayoutValue,
  type Layout,
  type LayoutRule,
} from './layout-rules'

function layout(
  overrides: Partial<Layout> = {},
  rules: LayoutRule[] = []
): Layout {
  return {
    object: 'projects.layout',
    id: 'lay_1',
    entity: 'project',
    workItemTypeId: null,
    name: 'Default',
    version: 1,
    isDefault: true,
    builtIn: false,
    sections: [
      {
        key: 'main',
        title: 'Main',
        columns: 1,
        fields: [
          { fieldKey: 'title', width: 1, visible: true },
          { fieldKey: 'description', width: 1, visible: true },
          { fieldKey: 'state', width: 1, visible: false },
        ],
      },
    ],
    rules,
    ...overrides,
  }
}

function rule(
  then: LayoutRule['then'],
  when: LayoutRule['when'] = [],
  key = 'rule-one'
): LayoutRule {
  return { key, when, then }
}

describe('layout system field keys', () => {
  it('covers the plan vocabulary', () => {
    expect([...LAYOUT_SYSTEM_FIELD_KEYS]).toEqual([
      'title',
      'description',
      'state',
      'priority',
      'assignee',
      'dueDate',
      'startDate',
      'estimate',
      'labels',
      'phase',
      'taskList',
    ])
  })
})

describe('evaluateLayoutRules defaults', () => {
  it('starts from authored visibility with nothing required or disabled', () => {
    expect(evaluateLayoutRules(layout(), {})).toEqual({
      title: { visible: true, required: false, disabled: false },
      description: { visible: true, required: false, disabled: false },
      state: { visible: false, required: false, disabled: false },
    })
  })

  it('omits fields the layout never declares', () => {
    expect(evaluateLayoutRules(layout(), { ghost: 'x' }).ghost).toBeUndefined()
  })

  it('returns no states for a layout without sections', () => {
    expect(evaluateLayoutRules(layout({ sections: [] }), {})).toEqual({})
  })
})

describe('evaluateLayoutRules conditions', () => {
  it('matches equals on scalar values', () => {
    const rules = [
      rule([{ fieldKey: 'description', effect: 'require' }], [
        { fieldKey: 'state', op: 'equals', value: 'active' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'active' }).description
        .required
    ).toBe(true)
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'archived' }).description
        .required
    ).toBe(false)
  })

  it('matches equals against null for missing values', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'assignee', op: 'equals' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), {}).title.disabled
    ).toBe(true)
  })

  it('matches equals element-wise for arrays', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'labels', op: 'equals', value: ['a', 'b'] },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { labels: ['a', 'b'] }).title
        .disabled
    ).toBe(true)
    expect(
      evaluateLayoutRules(layout({}, rules), { labels: ['b', 'a'] }).title
        .disabled
    ).toBe(false)
    expect(
      evaluateLayoutRules(layout({}, rules), { labels: 'a' }).title.disabled
    ).toBe(false)
  })

  it('negates equals with not-equals', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'state', op: 'not-equals', value: 'active' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'active' }).title
        .disabled
    ).toBe(false)
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'archived' }).title
        .disabled
    ).toBe(true)
  })

  it('matches in for scalar values', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'state', op: 'in', value: ['active', 'paused'] },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'paused' }).title
        .disabled
    ).toBe(true)
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'done' }).title.disabled
    ).toBe(false)
  })

  it('matches in when any array item is allowed', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'labels', op: 'in', value: ['vip'] },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { labels: ['a', 'vip'] }).title
        .disabled
    ).toBe(true)
    expect(
      evaluateLayoutRules(layout({}, rules), { labels: ['a'] }).title.disabled
    ).toBe(false)
  })

  it('never matches in without an array condition value', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'state', op: 'in', value: 'active' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'active' }).title
        .disabled
    ).toBe(false)
  })

  it('never matches in for missing values', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'state', op: 'in', value: ['active'] },
      ]),
    ]
    expect(evaluateLayoutRules(layout({}, rules), {}).title.disabled).toBe(
      false
    )
  })

  it.each([null, undefined, '', []] as (string | string[] | null | undefined)[])(
    'treats %s as empty',
    (empty) => {
      const rules = [
        rule([{ fieldKey: 'title', effect: 'disable' }], [
          { fieldKey: 'description', op: 'is-empty' },
        ]),
      ]
      expect(
        evaluateLayoutRules(layout({}, rules), { description: empty }).title
          .disabled
      ).toBe(true)
    }
  )

  it.each([['x'], ['x', 'y']] as string[][])(
    'treats %s as not empty',
    (value) => {
      const rules = [
        rule([{ fieldKey: 'title', effect: 'disable' }], [
          { fieldKey: 'description', op: 'is-empty' },
        ]),
      ]
      expect(
        evaluateLayoutRules(layout({}, rules), { description: value }).title
          .disabled
      ).toBe(false)
    }
  )

  it('treats a scalar string as not empty', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'description', op: 'is-empty' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { description: 'x' }).title
        .disabled
    ).toBe(false)
  })

  it('supports is-not-empty as the inverse of is-empty', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'require' }], [
        { fieldKey: 'description', op: 'is-not-empty' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { description: 'hi' }).title
        .required
    ).toBe(true)
    expect(evaluateLayoutRules(layout({}, rules), {}).title.required).toBe(
      false
    )
  })

  it('requires every when condition to match', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'disable' }], [
        { fieldKey: 'state', op: 'equals', value: 'active' },
        { fieldKey: 'description', op: 'is-not-empty' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'active' }).title
        .disabled
    ).toBe(false)
    expect(
      evaluateLayoutRules(
        layout({}, rules),
        { state: 'active', description: 'hi' }
      ).title.disabled
    ).toBe(true)
  })

  it('applies rules without conditions to every value set', () => {
    const rules = [rule([{ fieldKey: 'title', effect: 'disable' }], [])]
    expect(evaluateLayoutRules(layout({}, rules), {}).title.disabled).toBe(
      true
    )
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'x' }).title.disabled
    ).toBe(true)
  })
})

describe('evaluateLayoutRules precedence', () => {
  it('lets show reveal an authored-hidden field', () => {
    const rules = [rule([{ fieldKey: 'state', effect: 'show' }], [])]
    expect(evaluateLayoutRules(layout({}, rules), {}).state.visible).toBe(true)
  })

  it('lets hide win over show', () => {
    const rules = [
      rule([{ fieldKey: 'state', effect: 'show' }], [], 'show-it'),
      rule([{ fieldKey: 'state', effect: 'hide' }], [], 'hide-it'),
    ]
    expect(evaluateLayoutRules(layout({}, rules), {}).state.visible).toBe(
      false
    )
  })

  it('lets hide conceal an authored-visible field', () => {
    const rules = [
      rule([{ fieldKey: 'title', effect: 'hide' }], [
        { fieldKey: 'state', op: 'equals', value: 'archived' },
      ]),
    ]
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'archived' }).title
        .visible
    ).toBe(false)
    expect(
      evaluateLayoutRules(layout({}, rules), { state: 'active' }).title.visible
    ).toBe(true)
  })

  it('ignores require on hidden fields', () => {
    const rules = [
      rule(
        [
          { fieldKey: 'description', effect: 'hide' },
          { fieldKey: 'description', effect: 'require' },
        ],
        []
      ),
    ]
    expect(evaluateLayoutRules(layout({}, rules), {}).description).toEqual({
      visible: false,
      required: false,
      disabled: false,
    })
  })

  it('keeps require on visible fields', () => {
    const rules = [rule([{ fieldKey: 'title', effect: 'require' }], [])]
    expect(evaluateLayoutRules(layout({}, rules), {}).title.required).toBe(
      true
    )
  })

  it('keeps disable independent of hide', () => {
    const rules = [
      rule(
        [
          { fieldKey: 'title', effect: 'hide' },
          { fieldKey: 'title', effect: 'disable' },
        ],
        []
      ),
    ]
    expect(evaluateLayoutRules(layout({}, rules), {}).title).toEqual({
      visible: false,
      required: false,
      disabled: true,
    })
  })

  it('keeps disable independent of show', () => {
    const rules = [
      rule(
        [
          { fieldKey: 'state', effect: 'show' },
          { fieldKey: 'state', effect: 'disable' },
        ],
        []
      ),
    ]
    expect(evaluateLayoutRules(layout({}, rules), {}).state).toEqual({
      visible: true,
      required: false,
      disabled: true,
    })
  })

  it('ignores require that names an undeclared field', () => {
    const rules = [rule([{ fieldKey: 'cf:team', effect: 'require' }], [])]
    expect(evaluateLayoutRules(layout({}, rules), {})['cf:team']).toBeUndefined()
  })

  it('tracks show that names an undeclared field', () => {
    const rules = [rule([{ fieldKey: 'cf:team', effect: 'show' }], [])]
    expect(evaluateLayoutRules(layout({}, rules), {})['cf:team']).toEqual({
      visible: true,
      required: false,
      disabled: false,
    })
  })

  it('flags required fields even when their value is missing', () => {
    const rules = [
      rule([{ fieldKey: 'description', effect: 'require' }], [
        { fieldKey: 'state', op: 'equals', value: 'active' },
      ]),
    ]
    const states = evaluateLayoutRules(layout({}, rules), {
      state: 'active',
    })
    expect(states.description.required).toBe(true)
  })
})

describe('toLayoutValue', () => {
  it('maps null and undefined to null', () => {
    expect(toLayoutValue(null)).toBeNull()
    expect(toLayoutValue(undefined)).toBeNull()
  })

  it('keeps strings as-is', () => {
    expect(toLayoutValue('active')).toBe('active')
  })

  it('stringifies numbers and booleans', () => {
    expect(toLayoutValue(42)).toBe('42')
    expect(toLayoutValue(true)).toBe('true')
  })

  it('stringifies array items', () => {
    expect(toLayoutValue(['a', 1])).toEqual(['a', '1'])
  })

  it('maps objects to null', () => {
    expect(toLayoutValue({ key: 'a' })).toBeNull()
  })
})
