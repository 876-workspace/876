'use client'

import { memo, type ReactNode } from 'react'

import {
  FieldControl,
  FieldHint,
  FieldLabel,
  type SectionsProps,
} from './field-controls'
import type { FieldKey, FieldSpec, SectionSpec } from './field-spec'
import type { ProfileFormValues } from './profile-form'

type CellProps = {
  field: FieldSpec
  value: string
  disabled: boolean
  onChange: (key: FieldKey, value: string) => void
  /** Spans both columns — used for the street address line. */
  wide?: boolean
}

/**
 * One label-over-control cell. Module-level and memoized so typing in one
 * field re-renders that field alone, not all 23.
 */
const FieldCell = memo(function FieldCell({
  field,
  value,
  disabled,
  onChange,
  wide = false,
}: CellProps) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <FieldLabel
        field={field}
        className={
          field.required
            ? 'text-destructive text-xs'
            : 'text-muted-foreground text-xs'
        }
      />
      <FieldControl
        field={field}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      {field.hint ? <FieldHint>{field.hint}</FieldHint> : null}
    </div>
  )
})

type SectionProps = {
  section: SectionSpec
  values: ProfileFormValues
  disabled: boolean
  onChange: (key: FieldKey, value: string) => void
  logo: ReactNode
}

/** One titled section: heading above the card, fields two-up inside it. */
function ProfileSection({
  section,
  values,
  disabled,
  onChange,
  logo,
}: SectionProps) {
  const hasLogo = section.blocks.some((block) => block.kind === 'logo')

  return (
    <section
      id={`section-${section.id}`}
      className="scroll-mt-4"
    >
      <h2 className="876-section-title mb-3.5">{section.title}</h2>

      <div className="876-card flex flex-col gap-6 p-6">
        {hasLogo ? <div className="border-b pb-6">{logo}</div> : null}

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {section.blocks.flatMap((block) => {
            if (block.kind === 'logo') return []

            const fields =
              block.kind === 'address' ? block.fields : [block.field]

            return fields.map((field, index) => (
              <FieldCell
                key={field.key}
                field={field}
                value={values[field.key]}
                disabled={disabled}
                onChange={onChange}
                wide={block.kind === 'address' && index === 0}
              />
            ))
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * The profile body: one card per section, with labels stacked above their
 * control in a two-up grid so a 23-field form stays roughly one screen.
 */
export function ProfileSections({
  sections,
  values,
  disabled,
  onChange,
  logo,
}: SectionsProps) {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      {sections.map((section) => (
        <ProfileSection
          key={section.id}
          section={section}
          values={values}
          disabled={disabled}
          onChange={onChange}
          logo={logo}
        />
      ))}
    </div>
  )
}
