'use client'

import { useState } from 'react'

import { Button } from '@876/ui/button'
import { Checkbox } from '@876/ui/checkbox'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'

import { ACTION_LABELS, TRIGGER_LABELS } from './labels'
import type {
  AutomationAction,
  AutomationActionType,
  AutomationCondition,
  AutomationRule,
  AutomationTrigger,
} from './types'

export type AutomationRuleEditorProps = {
  initial: AutomationRule
}

type ConditionDraft = { fieldKey: string; op: string; value: string }

type ActionDraft = {
  type: AutomationActionType
  params: Record<string, string | number | boolean | null>
}

type ParamFieldSpec = {
  key: string
  label: string
  kind: 'text' | 'number' | 'checkbox'
  placeholder?: string
}

const CONDITION_OPS = [
  { value: 'equals', label: 'equals' },
  { value: 'not-equals', label: 'not equals' },
  { value: 'in', label: 'is one of' },
  { value: 'is-empty', label: 'is empty' },
  { value: 'is-not-empty', label: 'is not empty' },
] as const

const ACTION_TYPES = Object.keys(ACTION_LABELS) as AutomationActionType[]

const ACTION_PARAM_SPECS: Record<AutomationActionType, ParamFieldSpec[]> = {
  'set-field': [
    { key: 'fieldKey', label: 'Field key', kind: 'text' },
    { key: 'value', label: 'Value', kind: 'text' },
  ],
  assign: [{ key: 'assigneeId', label: 'Assignee ID', kind: 'text' }],
  'add-label': [{ key: 'label', label: 'Label', kind: 'text' }],
  'remove-label': [{ key: 'label', label: 'Label', kind: 'text' }],
  'create-reminder': [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'daysFromNow', label: 'Days from now', kind: 'number' },
  ],
  'create-event': [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'daysFromNow', label: 'Days from now', kind: 'number' },
  ],
  notify: [
    { key: 'userId', label: 'User ID', kind: 'text' },
    { key: 'message', label: 'Message', kind: 'text' },
  ],
  'call-webhook': [{ key: 'url', label: 'URL', kind: 'text' }],
  'create-sub-item': [{ key: 'title', label: 'Title', kind: 'text' }],
}

function domId(...parts: string[]): string {
  return parts.join('-').replace(/[^a-zA-Z0-9_-]/g, '-')
}

function splitValues(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
}

function conditionToDraft(condition: AutomationCondition): ConditionDraft {
  const value = Array.isArray(condition.value)
    ? condition.value.join(', ')
    : (condition.value ?? '')
  return { fieldKey: condition.fieldKey, op: condition.op, value }
}

function draftToCondition(draft: ConditionDraft): AutomationCondition {
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

function actionToDraft(action: AutomationAction): ActionDraft {
  return { type: action.type, params: { ...action.params } }
}

function defaultParams(type: AutomationActionType): ActionDraft['params'] {
  const params: Record<string, string | number | boolean | null> = {}
  for (const spec of ACTION_PARAM_SPECS[type]) {
    params[spec.key] = spec.kind === 'number' ? 0 : ''
  }
  return params
}

/**
 * Edits an automation rule's trigger, conditions, and actions and posts the
 * rule as JSON in a `rule` field. The webhook secret travels in its own
 * `webhookSecret` password input so a blank value keeps the stored secret.
 */
export function AutomationRuleEditor({ initial }: AutomationRuleEditorProps) {
  const [name, setName] = useState(initial.name)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [trigger, setTrigger] = useState<AutomationTrigger>(initial.trigger)
  const [conditions, setConditions] = useState<ConditionDraft[]>(() =>
    initial.conditions.map(conditionToDraft)
  )
  const [actions, setActions] = useState<ActionDraft[]>(() =>
    initial.actions.map(actionToDraft)
  )

  const rule: AutomationRule = {
    object: 'projects.automation-rule',
    id: initial.id,
    projectId: initial.projectId,
    name,
    enabled,
    trigger,
    conditions: conditions.map(draftToCondition),
    actions: actions.map((action) => ({
      type: action.type,
      params: { ...action.params },
    })),
    hasWebhookSecret: initial.hasWebhookSecret,
    updatedAt: initial.updatedAt,
  }
  const serialized = JSON.stringify(rule)
  const showsWebhookSecret = actions.some(
    (action) => action.type === 'call-webhook'
  )

  function updateCondition(index: number, patch: Partial<ConditionDraft>) {
    setConditions((current) =>
      current.map((condition, position) =>
        position === index ? { ...condition, ...patch } : condition
      )
    )
  }

  function removeCondition(index: number) {
    setConditions((current) =>
      current.filter((_, position) => position !== index)
    )
  }

  function updateAction(index: number, patch: Partial<ActionDraft>) {
    setActions((current) =>
      current.map((action, position) =>
        position === index ? { ...action, ...patch } : action
      )
    )
  }

  function updateActionParam(
    index: number,
    key: string,
    value: string | number | boolean | null
  ) {
    setActions((current) =>
      current.map((action, position) =>
        position === index
          ? { ...action, params: { ...action.params, [key]: value } }
          : action
      )
    )
  }

  function changeActionType(index: number, type: AutomationActionType) {
    setActions((current) =>
      current.map((action, position) =>
        position === index
          ? { type, params: defaultParams(type) }
          : action
      )
    )
  }

  function removeAction(index: number) {
    setActions((current) =>
      current.filter((_, position) => position !== index)
    )
  }

  return (
    <div data-slot="automation-rule-editor" className="flex flex-col gap-6">
      <input type="hidden" name="rule" value={serialized} readOnly />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="automation-rule-name">Name</Label>
          <Input
            id="automation-rule-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="automation-rule-trigger">Trigger</Label>
          <NativeSelect
            id="automation-rule-trigger"
            value={trigger}
            onChange={(event) =>
              setTrigger(event.target.value as AutomationTrigger)
            }
          >
            {(Object.keys(TRIGGER_LABELS) as AutomationTrigger[]).map(
              (value) => (
                <NativeSelectOption key={value} value={value}>
                  {TRIGGER_LABELS[value]}
                </NativeSelectOption>
              )
            )}
          </NativeSelect>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id="automation-rule-enabled"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked)}
          />
          <Label htmlFor="automation-rule-enabled" className="mb-0">
            Enabled
          </Label>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Conditions</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setConditions((current) => [
                ...current,
                { fieldKey: '', op: 'equals', value: '' },
              ])
            }
          >
            Add condition
          </Button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No conditions. The rule runs on every trigger event.
          </p>
        ) : null}

        {conditions.map((condition, index) => (
          <div
            key={index}
            data-slot="automation-rule-condition"
            className="flex flex-wrap items-end gap-2"
          >
            <div>
              <Label htmlFor={domId('condition', String(index), 'field')}>
                Field
              </Label>
              <Input
                id={domId('condition', String(index), 'field')}
                aria-label={`Condition field ${index + 1}`}
                className="w-40"
                value={condition.fieldKey}
                onChange={(event) =>
                  updateCondition(index, { fieldKey: event.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor={domId('condition', String(index), 'op')}>
                Operator
              </Label>
              <NativeSelect
                id={domId('condition', String(index), 'op')}
                aria-label={`Condition operator ${index + 1}`}
                value={condition.op}
                onChange={(event) =>
                  updateCondition(index, { op: event.target.value })
                }
              >
                {CONDITION_OPS.map((op) => (
                  <NativeSelectOption key={op.value} value={op.value}>
                    {op.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            {condition.op === 'is-empty' ||
            condition.op === 'is-not-empty' ? null : (
              <div>
                <Label htmlFor={domId('condition', String(index), 'value')}>
                  Value
                </Label>
                <Input
                  id={domId('condition', String(index), 'value')}
                  aria-label={`Condition value ${index + 1}`}
                  className="w-40"
                  value={condition.value}
                  onChange={(event) =>
                    updateCondition(index, { value: event.target.value })
                  }
                />
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeCondition(index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Actions</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setActions((current) => [
                ...current,
                { type: 'set-field', params: defaultParams('set-field') },
              ])
            }
          >
            Add action
          </Button>
        </div>

        {actions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No actions yet.</p>
        ) : null}

        {actions.map((action, index) => (
          <div
            key={index}
            data-slot="automation-rule-action"
            className="flex flex-col gap-3 rounded-md border p-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label htmlFor={domId('action', String(index), 'type')}>
                  Action
                </Label>
                <NativeSelect
                  id={domId('action', String(index), 'type')}
                  aria-label={`Action ${index + 1} type`}
                  value={action.type}
                  onChange={(event) =>
                    changeActionType(
                      index,
                      event.target.value as AutomationActionType
                    )
                  }
                >
                  {ACTION_TYPES.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {ACTION_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeAction(index)}
              >
                Remove
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              {ACTION_PARAM_SPECS[action.type].map((spec) => {
                const raw = action.params[spec.key]
                if (spec.kind === 'checkbox') {
                  const id = domId('action', String(index), spec.key)
                  return (
                    <span key={spec.key} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={raw === true}
                        onCheckedChange={(checked) =>
                          updateActionParam(index, spec.key, checked)
                        }
                      />
                      <Label htmlFor={id} className="mb-0">
                        {spec.label}
                      </Label>
                    </span>
                  )
                }
                if (spec.kind === 'number') {
                  return (
                    <div key={spec.key}>
                      <Label htmlFor={domId('action', String(index), spec.key)}>
                        {spec.label}
                      </Label>
                      <Input
                        id={domId('action', String(index), spec.key)}
                        aria-label={`Action ${index + 1} ${spec.label}`}
                        className="w-32"
                        inputMode="numeric"
                        value={raw === null || raw === undefined ? '' : String(raw)}
                        onChange={(event) => {
                          const text = event.target.value
                          if (text === '') {
                            updateActionParam(index, spec.key, null)
                            return
                          }
                          const parsed = Number(text)
                          updateActionParam(
                            index,
                            spec.key,
                            Number.isFinite(parsed) ? parsed : text
                          )
                        }}
                      />
                    </div>
                  )
                }
                return (
                  <div key={spec.key} className="min-w-40 flex-1">
                    <Label htmlFor={domId('action', String(index), spec.key)}>
                      {spec.label}
                    </Label>
                    <Input
                      id={domId('action', String(index), spec.key)}
                      aria-label={`Action ${index + 1} ${spec.label}`}
                      placeholder={spec.placeholder}
                      value={raw === null || raw === undefined ? '' : String(raw)}
                      onChange={(event) =>
                        updateActionParam(index, spec.key, event.target.value)
                      }
                    />
                  </div>
                )
              })}
            </div>

            {action.type === 'call-webhook' ? (
              <p className="text-muted-foreground text-xs">
                The secret is set below. Blank keeps the existing secret.
              </p>
            ) : null}
          </div>
        ))}
      </section>

      {showsWebhookSecret ? (
        <div className="max-w-md">
          <Label htmlFor="automation-rule-webhook-secret">
            Webhook secret
          </Label>
          <Input
            id="automation-rule-webhook-secret"
            name="webhookSecret"
            type="password"
            autoComplete="new-password"
            placeholder="Leave blank to keep the existing secret"
          />
        </div>
      ) : null}
    </div>
  )
}
