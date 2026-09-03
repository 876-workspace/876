'use client'

import { labelsClient } from '@/lib/client'

import { CreateResourceForm } from './create-resource-form'

export function NewLabelForm() {
  return (
    <CreateResourceForm
      nameLabel="Name"
      namePlaceholder="bug"
      submit={({ name, description }) =>
        labelsClient.create({ name, description })
      }
      redirectTo={() => '/labels'}
    />
  )
}
