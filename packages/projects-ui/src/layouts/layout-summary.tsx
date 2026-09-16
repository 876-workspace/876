import type { Layout, LayoutCondition, LayoutEffect } from './types'

type LayoutSummaryProps = {
  layout: Layout
  /** Labels for the keys the layout references; a missing key renders as it is. */
  fieldLabels?: Record<string, string>
}

const OP_LABELS: Record<LayoutCondition['op'], string> = {
  equals: 'equals',
  'not-equals': 'does not equal',
  in: 'is one of',
  'is-empty': 'is empty',
  'is-not-empty': 'is not empty',
}

const EFFECT_LABELS: Record<LayoutEffect['effect'], string> = {
  show: 'Show',
  hide: 'Hide',
  require: 'Require',
  disable: 'Disable',
}

function valuesText(value: string | string[] | undefined): string {
  if (value === undefined) return ''

  return Array.isArray(value) ? value.join(', ') : value
}

function conditionText(
  condition: LayoutCondition,
  fieldLabel: (fieldKey: string) => string
): string {
  const text = `${fieldLabel(condition.fieldKey)} ${OP_LABELS[condition.op]}`
  const values = valuesText(condition.value)

  return values === '' ? text : `${text} ${values}`
}

function whenText(
  rule: Layout['rules'][number],
  fieldLabel: (fieldKey: string) => string
): string {
  if (rule.when.length === 0) return 'always'

  return `when ${rule.when
    .map((condition) => conditionText(condition, fieldLabel))
    .join(' and ')}`
}

function thenText(
  rule: Layout['rules'][number],
  fieldLabel: (fieldKey: string) => string
): string {
  if (rule.then.length === 0) return 'nothing'

  return `then ${rule.then
    .map(
      (effect) =>
        `${EFFECT_LABELS[effect.effect]} ${fieldLabel(effect.fieldKey)}`
    )
    .join(', ')}`
}

/** Read-only overview of a layout's sections, fields, and rules. */
export function LayoutSummary({
  layout,
  fieldLabels = {},
}: LayoutSummaryProps) {
  const fieldLabel = (fieldKey: string) => fieldLabels[fieldKey] ?? fieldKey

  return (
    <div data-slot="layout-summary" className="flex flex-col gap-4">
      <header className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{layout.name}</h3>
        <p className="text-muted-foreground text-xs">
          {layout.entity}
          {layout.isDefault ? ' · Default' : ''}
          {layout.builtIn ? ' · Built-in' : ''}
        </p>
      </header>

      {layout.sections.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sections.</p>
      ) : null}

      {layout.sections.map((section) => (
        <section
          key={section.key}
          data-slot="layout-summary-section"
          className="flex flex-col gap-1.5"
        >
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-medium">{section.title}</h4>
            <span className="text-muted-foreground text-xs">
              {section.columns === 2 ? '2 columns' : '1 column'}
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {section.fields.map((field) => (
              <li
                key={field.fieldKey}
                data-slot="layout-summary-field"
                className="text-muted-foreground flex items-baseline gap-2 text-xs"
              >
                <span className="text-foreground">
                  {fieldLabel(field.fieldKey)}
                </span>
                <span>
                  {field.width === 2 ? 'Spans 2 columns' : 'Spans 1 column'}
                </span>
                {field.visible ? null : <span>Hidden</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section
        data-slot="layout-summary-rules"
        className="flex flex-col gap-1.5"
      >
        <h4 className="text-sm font-medium">Rules</h4>
        {layout.rules.length === 0 ? (
          <p className="text-muted-foreground text-xs">No rules.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {layout.rules.map((rule) => (
              <li
                key={rule.key}
                data-slot="layout-summary-rule"
                className="flex flex-wrap items-baseline gap-2 text-xs"
              >
                <span className="text-foreground">{rule.key}</span>
                <span className="text-muted-foreground">
                  {whenText(rule, fieldLabel)}
                </span>
                <span className="text-muted-foreground">
                  {thenText(rule, fieldLabel)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export type { LayoutSummaryProps }
