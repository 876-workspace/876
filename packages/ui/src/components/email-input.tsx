'use client'

import * as React from 'react'

import { Mail } from '../icons'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'

type EmailInputProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  'type'
> & { className?: string }

/**
 * An email field with the envelope icon inside the control.
 *
 * The icon sits in the box rather than beside it so the field is recognisable
 * before it is read, and so a row of mixed fields keeps one alignment axis.
 */
function EmailInput({ className, ...props }: EmailInputProps) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <Mail aria-hidden />
      </InputGroupAddon>
      <InputGroupInput type="email" autoComplete="email" {...props} />
    </InputGroup>
  )
}

export { EmailInput }
