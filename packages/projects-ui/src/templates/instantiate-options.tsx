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

/** The instantiate request's three inclusion flags, as submitted by the form. */
export type InstantiateOptionsValues = {
  includeWorkItems: boolean
  includeDependencies: boolean
  includeBudgets: boolean
}

export type InstantiateOptionsProps = {
  defaultValues?: Partial<InstantiateOptionsValues>
}

/** Everything the template carries is included unless the caller says otherwise. */
export const INSTANTIATE_OPTION_DEFAULTS: InstantiateOptionsValues = {
  includeWorkItems: true,
  includeDependencies: true,
  includeBudgets: true,
}

const OPTIONS: {
  name: keyof InstantiateOptionsValues
  label: string
  description: string
}[] = [
  {
    name: 'includeWorkItems',
    label: 'Work items',
    description: 'Phases, task lists, and work items',
  },
  {
    name: 'includeDependencies',
    label: 'Dependencies',
    description: 'Links between the new work items',
  },
  {
    name: 'includeBudgets',
    label: 'Budgets',
    description: 'Budget defaults from the template',
  },
]

/**
 * Uncontrolled checkbox group: every box is a named form control, so a
 * surrounding form reads "true" / "false" per flag with no state or callbacks.
 */
export function InstantiateOptions({ defaultValues }: InstantiateOptionsProps) {
  const values = { ...INSTANTIATE_OPTION_DEFAULTS, ...defaultValues }

  return (
    <FieldSet>
      <FieldLegend variant="label">Include in the new project</FieldLegend>
      <FieldGroup data-slot="checkbox-group">
        {OPTIONS.map((option) => (
          <Field key={option.name} orientation="horizontal">
            <Checkbox
              id={option.name}
              name={option.name}
              value="true"
              uncheckedValue="false"
              defaultChecked={values[option.name]}
            />
            <FieldContent>
              <FieldLabel htmlFor={option.name}>{option.label}</FieldLabel>
              <FieldDescription>{option.description}</FieldDescription>
            </FieldContent>
          </Field>
        ))}
      </FieldGroup>
    </FieldSet>
  )
}
