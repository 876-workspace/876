'use client'

import { Button } from '@876/ui/button'
import { FormRow } from '@876/ui/form-row'
import { Input } from '@876/ui/input'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { formatDateInput, parseDateInput } from '@/lib/date-input'

/**
 * The start date the preview is rendered for.
 *
 * The preview itself is server-rendered from `?start=`, so this form only
 * moves the URL — it holds no preview state of its own.
 */
export function TemplateStartForm({
  basePath,
  startDate,
}: {
  basePath: string
  startDate: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(startDate)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = parseDateInput(value)
    const query = parsed === null ? '' : `?start=${formatDateInput(parsed)}`
    router.replace(`${basePath}${query}`, { scroll: false })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="876-card max-w-3xl space-y-5 p-6"
      aria-label="Preview"
    >
      <FormRow
        label="Start date"
        htmlFor="template-start"
        required
        hint="The template stores offsets in days, so every date it produces is measured from here."
      >
        <Input
          id="template-start"
          type="date"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full sm:w-56"
        />
      </FormRow>

      <div className="flex justify-end">
        <Button type="submit" variant="info">
          Preview
        </Button>
      </div>
    </form>
  )
}
