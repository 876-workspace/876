'use client'

import { issuesClient } from '@/lib/client'

import { CreateResourceForm } from './create-resource-form'

export function NewIssueForm() {
  return (
    <CreateResourceForm
      nameLabel="Title"
      namePlaceholder="Fix the login redirect"
      hint="Without a project the issue lands in Triage."
      submit={({ name, description }) =>
        issuesClient.create({ title: name, description })
      }
      redirectTo={() => '/issues'}
    />
  )
}
