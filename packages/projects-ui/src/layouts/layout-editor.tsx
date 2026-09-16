'use client'

import { useState } from 'react'

import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import type {
  Layout,
  LayoutCondition,
  LayoutEffect,
  LayoutField,
  LayoutRule,
  LayoutSection,
} from './types'

type LayoutEditorProps = {
  initial: Layout
  availableFields: { fieldKey: string; label: string }[]
}

/** Condition values stay text while editing; only the serialized definition splits them. */
type ConditionDraft = {
  fieldKey: string
  op: LayoutCondition['op']
  value: string
}

type EffectDraft = { fieldKey: string; effect: LayoutEffect['effect'] }
type RuleDraft = { key: string; when: ConditionDraft[]; then: EffectDraft[] }

const CONDITION_OPS: { value: LayoutCondition['op']; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not-equals', label: 'not equals' },
  { value: 'in', label: 'is one of' },
  { value: 'is-empty', label: 'is empty' },
  { value: 'is-not-empty', label: 'is not empty' },
]

const EFFECTS: { value: LayoutEffect['effect']; label: string }[] = [
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
  { value: 'require', label: 'Require' },
  { value: 'disable', label: 'Disable' },
]

function domId(...parts: string[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '-')
}

function nextKey(prefix: string, taken: string[]): string {
  let index = taken.length + 1

  while (taken.includes(`${prefix}-${index}`)) index += 1

  return `${prefix}-${index}`
}

function splitValues(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
}

function conditionToDraft(condition: LayoutCondition): ConditionDraft {
  const value = Array.isArray(condition.value)
    ? condition.value.join(', ')
    : (condition.value ?? '')

  return { fieldKey: condition.fieldKey, op: condition.op, value }
}

function draftToCondition(draft: ConditionDraft): LayoutCondition {
  if (draft.op === 'is-empty' || draft.op === 'is-not-empty')
    return { fieldKey: draft.fieldKey, op: draft.op }

  if (draft.op === 'in')
    return {
      fieldKey: draft.fieldKey,
      op: draft.op,
      value: splitValues(draft.value),
    }

  return { fieldKey: draft.fieldKey, op: draft.op, value: draft.value }
}

function ruleToDraft(rule: LayoutRule): RuleDraft {
  return {
    key: rule.key,
    when: rule.when.map(conditionToDraft),
    then: rule.then.map((effect) => ({
      fieldKey: effect.fieldKey,
      effect: effect.effect,
    })),
  }
}

function draftToRule(draft: RuleDraft): LayoutRule {
  return {
    key: draft.key,
    when: draft.when.map(draftToCondition),
    then: draft.then.map((effect) => ({
      fieldKey: effect.fieldKey,
      effect: effect.effect,
    })),
  }
}

/**
 * Edits a layout's sections and rules and posts them as JSON in a
 * `definition` field, which is exactly what the API stores.
 */
export function LayoutEditor({ initial, availableFields }: LayoutEditorProps) {
  const [sections, setSections] = useState<LayoutSection[]>(
    () => initial.sections
  )
  const [rules, setRules] = useState<RuleDraft[]>(() =>
    initial.rules.map(ruleToDraft)
  )
  const [pendingField, setPendingField] = useState<Record<string, string>>({})

  const placedKeys = sections.flatMap((section) =>
    section.fields.map((field) => field.fieldKey)
  )
  const placed = new Set(placedKeys)
  const addableFields = availableFields.filter(
    (field) => !placed.has(field.fieldKey)
  )
  const fieldChoices = [
    ...new Set([
      ...availableFields.map((field) => field.fieldKey),
      ...placedKeys,
    ]),
  ].map((fieldKey) => ({
    fieldKey,
    label:
      availableFields.find((field) => field.fieldKey === fieldKey)?.label ??
      fieldKey,
  }))

  const definition = JSON.stringify({ sections, rules: rules.map(draftToRule) })

  function updateSection(
    sectionKey: string,
    update: (section: LayoutSection) => LayoutSection
  ) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey ? update(section) : section
      )
    )
  }

  function updateField(
    fieldKey: string,
    update: (field: LayoutField) => LayoutField
  ) {
    setSections((current) =>
      current.map((section) => ({
        ...section,
        fields: section.fields.map((field) =>
          field.fieldKey === fieldKey ? update(field) : field
        ),
      }))
    )
  }

  function updateRule(key: string, update: (rule: RuleDraft) => RuleDraft) {
    setRules((current) =>
      current.map((rule) => (rule.key === key ? update(rule) : rule))
    )
  }

  function addSection() {
    setSections((current) => [
      ...current,
      {
        key: nextKey(
          'section',
          current.map((section) => section.key)
        ),
        title: `Section ${current.length + 1}`,
        columns: 1,
        fields: [],
      },
    ])
  }

  function removeSection(sectionKey: string) {
    setSections((current) =>
      current.filter((section) => section.key !== sectionKey)
    )
  }

  function moveSection(index: number, offset: number) {
    setSections((current) => {
      const target = index + offset
      if (target < 0 || target >= current.length) return current

      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)

      return next
    })
  }

  function addField(sectionKey: string, fieldKey: string) {
    updateSection(sectionKey, (section) => ({
      ...section,
      fields: [...section.fields, { fieldKey, width: 1, visible: true }],
    }))
    setPendingField((current) => ({ ...current, [sectionKey]: '' }))
  }

  function removeField(fieldKey: string) {
    setSections((current) =>
      current.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.fieldKey !== fieldKey),
      }))
    )
  }

  function moveFieldToSection(fieldKey: string, targetSectionKey: string) {
    setSections((current) => {
      const moved = current
        .flatMap((section) => section.fields)
        .find((field) => field.fieldKey === fieldKey)
      if (!moved) return current

      return current.map((section) => {
        const remaining = section.fields.filter(
          (field) => field.fieldKey !== fieldKey
        )

        return section.key === targetSectionKey
          ? { ...section, fields: [...remaining, moved] }
          : { ...section, fields: remaining }
      })
    })
  }

  function moveFieldWithinSection(
    sectionKey: string,
    fieldKey: string,
    offset: number
  ) {
    updateSection(sectionKey, (section) => {
      const index = section.fields.findIndex(
        (field) => field.fieldKey === fieldKey
      )
      const target = index + offset
      if (index === -1 || target < 0 || target >= section.fields.length)
        return section

      const fields = [...section.fields]
      const [moved] = fields.splice(index, 1)
      fields.splice(target, 0, moved)

      return { ...section, fields }
    })
  }

  function setFieldVisible(fieldKey: string, visible: boolean) {
    updateField(fieldKey, (field) => ({ ...field, visible }))
  }

  function setFieldWidth(fieldKey: string, width: LayoutField['width']) {
    updateField(fieldKey, (field) => ({ ...field, width }))
  }

  function addRule() {
    const fieldKey = fieldChoices[0]?.fieldKey ?? ''

    setRules((current) => [
      ...current,
      {
        key: nextKey(
          'rule',
          current.map((rule) => rule.key)
        ),
        when: [{ fieldKey, op: 'equals', value: '' }],
        then: [{ fieldKey, effect: 'show' }],
      },
    ])
  }

  function removeRule(key: string) {
    setRules((current) => current.filter((rule) => rule.key !== key))
  }

  function addCondition(key: string) {
    updateRule(key, (rule) => ({
      ...rule,
      when: [
        ...rule.when,
        { fieldKey: fieldChoices[0]?.fieldKey ?? '', op: 'equals', value: '' },
      ],
    }))
  }

  function removeCondition(key: string, index: number) {
    updateRule(key, (rule) => ({
      ...rule,
      when: rule.when.filter((_, position) => position !== index),
    }))
  }

  function updateCondition(
    key: string,
    index: number,
    patch: Partial<ConditionDraft>
  ) {
    updateRule(key, (rule) => ({
      ...rule,
      when: rule.when.map((condition, position) =>
        position === index ? { ...condition, ...patch } : condition
      ),
    }))
  }

  function addEffect(key: string) {
    updateRule(key, (rule) => ({
      ...rule,
      then: [
        ...rule.then,
        { fieldKey: fieldChoices[0]?.fieldKey ?? '', effect: 'show' },
      ],
    }))
  }

  function removeEffect(key: string, index: number) {
    updateRule(key, (rule) => ({
      ...rule,
      then: rule.then.filter((_, position) => position !== index),
    }))
  }

  function updateEffect(
    key: string,
    index: number,
    patch: Partial<EffectDraft>
  ) {
    updateRule(key, (rule) => ({
      ...rule,
      then: rule.then.map((effect, position) =>
        position === index ? { ...effect, ...patch } : effect
      ),
    }))
  }

  return (
    <div data-slot="layout-editor" className="flex flex-col gap-6">
      <input type="hidden" name="definition" value={definition} readOnly />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Sections</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSection}
          >
            Add section
          </Button>
        </div>

        {sections.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sections yet.</p>
        ) : null}

        {sections.map((section, index) => (
          <div
            key={section.key}
            data-slot="layout-editor-section"
            className="flex flex-col gap-3 rounded-md border p-3"
          >
            <div
              data-slot="layout-editor-section-header"
              className="flex flex-wrap items-end gap-2"
            >
              <div className="min-w-40 flex-1">
                <Label htmlFor={domId(section.key, 'title')}>
                  Section title
                </Label>
                <Input
                  id={domId(section.key, 'title')}
                  value={section.title}
                  onChange={(event) =>
                    updateSection(section.key, (current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => moveSection(index, -1)}
              >
                Move up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === sections.length - 1}
                onClick={() => moveSection(index, 1)}
              >
                Move down
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeSection(section.key)}
              >
                Remove
              </Button>
            </div>

            <ul className="flex flex-col gap-2">
              {section.fields.map((field, fieldIndex) => (
                <li
                  key={field.fieldKey}
                  data-slot="layout-editor-field"
                  className="flex flex-wrap items-end gap-2"
                >
                  <span className="min-w-32 flex-1 text-sm">
                    {availableFields.find(
                      (candidate) => candidate.fieldKey === field.fieldKey
                    )?.label ?? field.fieldKey}
                  </span>
                  <div>
                    <Label
                      htmlFor={domId(section.key, field.fieldKey, 'section')}
                    >
                      Section
                    </Label>
                    <NativeSelect
                      id={domId(section.key, field.fieldKey, 'section')}
                      value={section.key}
                      onChange={(event) =>
                        moveFieldToSection(field.fieldKey, event.target.value)
                      }
                    >
                      {sections.map((target) => (
                        <NativeSelectOption key={target.key} value={target.key}>
                          {target.title}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fieldIndex === 0}
                    onClick={() =>
                      moveFieldWithinSection(section.key, field.fieldKey, -1)
                    }
                  >
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={fieldIndex === section.fields.length - 1}
                    onClick={() =>
                      moveFieldWithinSection(section.key, field.fieldKey, 1)
                    }
                  >
                    Move down
                  </Button>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={domId(section.key, field.fieldKey, 'visible')}
                      checked={field.visible}
                      onCheckedChange={(checked) =>
                        setFieldVisible(field.fieldKey, checked)
                      }
                    />
                    <Label
                      htmlFor={domId(section.key, field.fieldKey, 'visible')}
                      className="mb-0"
                    >
                      Visible
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={domId(section.key, field.fieldKey, 'width')}
                      checked={field.width === 2}
                      onCheckedChange={(checked) =>
                        setFieldWidth(field.fieldKey, checked ? 2 : 1)
                      }
                    />
                    <Label
                      htmlFor={domId(section.key, field.fieldKey, 'width')}
                      className="mb-0"
                    >
                      Full width
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeField(field.fieldKey)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <Label htmlFor={domId(section.key, 'add')}>Add field</Label>
                <NativeSelect
                  id={domId(section.key, 'add')}
                  value={pendingField[section.key] ?? ''}
                  onChange={(event) =>
                    setPendingField((current) => ({
                      ...current,
                      [section.key]: event.target.value,
                    }))
                  }
                >
                  <NativeSelectOption value="">
                    Select a field…
                  </NativeSelectOption>
                  {addableFields.map((field) => (
                    <NativeSelectOption
                      key={field.fieldKey}
                      value={field.fieldKey}
                    >
                      {field.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!pendingField[section.key]}
                onClick={() => addField(section.key, pendingField[section.key])}
              >
                Add field
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Rules</h3>
          <Button type="button" variant="outline" size="sm" onClick={addRule}>
            Add rule
          </Button>
        </div>

        {rules.length === 0 ? (
          <p className="text-muted-foreground text-sm">No rules yet.</p>
        ) : null}

        {rules.map((rule) => (
          <div
            key={rule.key}
            data-slot="layout-editor-rule"
            className="flex flex-col gap-3 rounded-md border p-3"
          >
            <div
              data-slot="layout-editor-rule-header"
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium">{rule.key}</span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeRule(rule.key)}
              >
                Remove
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                When
              </span>
              {rule.when.map((condition, index) => (
                <div
                  key={index}
                  data-slot="layout-editor-condition"
                  className="flex flex-wrap items-end gap-2"
                >
                  <NativeSelect
                    aria-label={`Condition field ${index + 1}`}
                    value={condition.fieldKey}
                    onChange={(event) =>
                      updateCondition(rule.key, index, {
                        fieldKey: event.target.value,
                      })
                    }
                  >
                    {fieldChoices.map((choice) => (
                      <NativeSelectOption
                        key={choice.fieldKey}
                        value={choice.fieldKey}
                      >
                        {choice.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    aria-label={`Condition operator ${index + 1}`}
                    value={condition.op}
                    onChange={(event) =>
                      updateCondition(rule.key, index, {
                        op: event.target.value as LayoutCondition['op'],
                      })
                    }
                  >
                    {CONDITION_OPS.map((op) => (
                      <NativeSelectOption key={op.value} value={op.value}>
                        {op.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  {condition.op === 'is-empty' ||
                  condition.op === 'is-not-empty' ? null : (
                    <Input
                      aria-label={`Condition value ${index + 1}`}
                      className="w-40"
                      value={condition.value}
                      onChange={(event) =>
                        updateCondition(rule.key, index, {
                          value: event.target.value,
                        })
                      }
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCondition(rule.key, index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addCondition(rule.key)}
                >
                  Add condition
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium uppercase">
                Then
              </span>
              {rule.then.map((effect, index) => (
                <div
                  key={index}
                  data-slot="layout-editor-effect"
                  className="flex flex-wrap items-end gap-2"
                >
                  <NativeSelect
                    aria-label={`Effect field ${index + 1}`}
                    value={effect.fieldKey}
                    onChange={(event) =>
                      updateEffect(rule.key, index, {
                        fieldKey: event.target.value,
                      })
                    }
                  >
                    {fieldChoices.map((choice) => (
                      <NativeSelectOption
                        key={choice.fieldKey}
                        value={choice.fieldKey}
                      >
                        {choice.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    aria-label={`Effect ${index + 1}`}
                    value={effect.effect}
                    onChange={(event) =>
                      updateEffect(rule.key, index, {
                        effect: event.target.value as LayoutEffect['effect'],
                      })
                    }
                  >
                    {EFFECTS.map((option) => (
                      <NativeSelectOption
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeEffect(rule.key, index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEffect(rule.key)}
                >
                  Add effect
                </Button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

export type { LayoutEditorProps }
