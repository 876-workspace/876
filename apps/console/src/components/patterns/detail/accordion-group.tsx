'use client'

import type { ReactNode } from 'react'
import { Accordion } from '@876/ui/accordion'

export function AccordionGroup({
  defaultValue,
  children,
}: {
  defaultValue?: string
  children: ReactNode
}) {
  return (
    <Accordion
      multiple={false}
      defaultValue={defaultValue ? [defaultValue] : []}
      className="gap-3"
    >
      {children}
    </Accordion>
  )
}
