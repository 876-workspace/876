import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectCustomFieldsPanel } from './project-custom-fields-panel'

const fields = [
  {
    object: 'projects.project-custom-field',
    id: 'field_1',
    tenantId: 'tenant_1',
    key: 'business-unit',
    label: 'Business unit',
    fieldType: 'text',
    options: [],
    required: false,
    description: null,
    position: 0,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    object: 'projects.project-custom-field',
    id: 'field_2',
    tenantId: 'tenant_1',
    key: 'is-billable',
    label: 'Billable',
    fieldType: 'boolean',
    options: [],
    required: false,
    description: null,
    position: 1,
    archivedAt: null,
    createdAt: 1,
    updatedAt: 1,
  },
] as const

describe('ProjectCustomFieldsPanel', () => {
  it('renders nothing without field definitions', () => {
    const { container } = render(
      <ProjectCustomFieldsPanel fields={[]} values={[]} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows labeled values on the project overview', () => {
    render(
      <ProjectCustomFieldsPanel
        fields={[...fields]}
        values={[
          {
            object: 'projects.project-custom-field-value',
            id: 'value_1',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            fieldId: 'field_1',
            fieldKey: 'business-unit',
            fieldType: 'text',
            value: 'Retail',
            updatedBy: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
      />
    )
    expect(screen.getByText('Business unit')).toBeInTheDocument()
    expect(screen.getByText('Retail')).toBeInTheDocument()
  })

  it('formats booleans and missing values', () => {
    render(
      <ProjectCustomFieldsPanel
        fields={[...fields]}
        values={[
          {
            object: 'projects.project-custom-field-value',
            id: 'value_2',
            tenantId: 'tenant_1',
            projectId: 'project_1',
            fieldId: 'field_2',
            fieldKey: 'is-billable',
            fieldType: 'boolean',
            value: true,
            updatedBy: null,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
      />
    )
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('Billable')).toBeInTheDocument()
  })
})
