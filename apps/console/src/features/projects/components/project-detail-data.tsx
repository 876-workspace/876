import { AppError } from '@876/ui/app-error'
import {
  DetailCardFact,
  DetailCardFacts,
  DetailCardSection,
} from '@876/ui/detail-card'
import { notFound } from 'next/navigation'

import type { ProjectCustomFieldValue } from '@876/projects/contracts'
import { projects } from '@/lib/services/projects'
import { ProjectDetail } from '@876/projects-ui/project-detail'

function valueText(value: ProjectCustomFieldValue['value']): string {
  if (value === null || value === '') return 'Not set'
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not set'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export async function ProjectDetailData({
  organizationId,
  base,
  projectId,
}: {
  organizationId: string
  base: string
  projectId: string
}) {
  const [projectResult, issuesResult, fieldsResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.issues.list(organizationId, { project: projectId }),
    projects.projectCustomFields.list(organizationId),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const project = projectResult.data
  const fieldLabels = new Map(
    (fieldsResult.data?.data ?? []).map((field) => [field.id, field.label])
  )

  return (
    <div className="space-y-8">
      {fieldsResult.error ? (
        <AppError
          title="Some project details could not be loaded"
          error={fieldsResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <ProjectDetail
        project={project}
        issues={issuesResult.data?.data ?? []}
        issuesHref={`${base}/issues`}
      />
      {project.customFields.length > 0 ? (
        <section className="876-card px-5 py-5 sm:px-6">
          <DetailCardSection title="Custom fields">
            <DetailCardFacts>
              {project.customFields.map((value) => (
                <DetailCardFact
                  key={value.id}
                  label={fieldLabels.get(value.fieldId) ?? value.fieldKey}
                  value={valueText(value.value)}
                />
              ))}
            </DetailCardFacts>
          </DetailCardSection>
        </section>
      ) : null}
    </div>
  )
}
