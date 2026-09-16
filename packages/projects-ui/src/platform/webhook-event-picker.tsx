'use client'

import { Checkbox } from '@876/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@876/ui/field'

export type WebhookEventPickerProps = {
  options: readonly string[]
  defaultSelected?: readonly string[]
}

export function WebhookEventPicker({
  options,
  defaultSelected = [],
}: WebhookEventPickerProps) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Event types</FieldLegend>
      <FieldGroup data-slot="webhook-event-picker">
        {options.length === 0 ? (
          <p className="text-muted-foreground text-sm">No event types available</p>
        ) : (
          options.map((option) => (
            <Field key={option} orientation="horizontal">
              <Checkbox
                id={`event-type-${option}`}
                name="eventTypes"
                value={option}
                defaultChecked={defaultSelected.includes(option)}
              />
              <FieldContent>
                <FieldLabel htmlFor={`event-type-${option}`}>{option}</FieldLabel>
              </FieldContent>
            </Field>
          ))
        )}
      </FieldGroup>
    </FieldSet>
  )
}
