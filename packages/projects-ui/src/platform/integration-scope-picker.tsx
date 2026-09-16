'use client'

import { Checkbox } from '@876/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@876/ui/field'

export const INTEGRATION_SCOPES = [
  'projects:read',
  'projects:write',
  'time:read',
  'time:write',
  'webhooks:manage',
] as const

export type IntegrationScope = (typeof INTEGRATION_SCOPES)[number]

const SCOPE_DESCRIPTIONS: Record<IntegrationScope, string> = {
  'projects:read': 'Read projects, phases, and work items',
  'projects:write': 'Create and update projects and work items',
  'time:read': 'Read time entries and timesheets',
  'time:write': 'Log and edit time entries',
  'webhooks:manage': 'Manage webhook endpoints and deliveries',
}

export type IntegrationScopePickerProps = {
  defaultSelected?: readonly string[]
}

export function IntegrationScopePicker({
  defaultSelected = [],
}: IntegrationScopePickerProps) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Scopes</FieldLegend>
      <FieldGroup data-slot="integration-scope-picker">
        {INTEGRATION_SCOPES.map((scope) => (
          <Field key={scope} orientation="horizontal">
            <Checkbox
              id={`scope-${scope}`}
              name="scopes"
              value={scope}
              defaultChecked={defaultSelected.includes(scope)}
            />
            <FieldContent>
              <FieldLabel htmlFor={`scope-${scope}`}>{scope}</FieldLabel>
              <FieldDescription>{SCOPE_DESCRIPTIONS[scope]}</FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  )
}
