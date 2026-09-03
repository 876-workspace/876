'use client'

import { projectsClient } from '@/lib/client'

import { CreateResourceForm } from './create-resource-form'

export function NewProjectForm() {
  return (
    <CreateResourceForm
      nameLabel="Name"
      namePlaceholder="Console Revamp"
      hint="The issue key is derived from the name — CONSOL-1, CONSOL-2 — and cannot be changed once issues exist."
      submit={({ name, description }) =>
        projectsClient.create({ name, description })
      }
      redirectTo={(created) => `/projects/${created.id}`}
    />
  )
}
