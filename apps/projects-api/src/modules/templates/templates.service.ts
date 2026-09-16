import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as finance from '../finance/index.js'
import * as issues from '../issues/index.js'
import * as labels from '../labels/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import type { SerializedProject } from '../projects/index.js'
import {
  captureDefinition,
  type CaptureInputs,
} from './templates.capture.js'
import {
  planMaterialization,
  type MaterializeCatalogs,
  type MaterializePlan,
  type MissingReferences,
} from './templates.materialize.js'
import * as repository from './templates.repository.js'
import { TemplateMissingError } from './templates.repository.js'
import {
  serializeProjectTemplate,
  serializeProjectTemplateVersion,
  serializeTemplatePreview,
  type SerializedProjectTemplate,
  type SerializedProjectTemplateTombstone,
  type SerializedProjectTemplateVersion,
  type SerializedTemplatePreview,
} from './templates.serializers.js'
import {
  templateDefinitionSchema,
  type CloneProjectBody,
  type CreateTemplateBody,
  type InstantiateTemplateBody,
  type PreviewTemplateBody,
  type SaveAsTemplateBody,
  type TemplateDefinition,
  type UpdateTemplateBody,
} from './templates.schemas.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

export type InstantiateResult = {
  project: SerializedProject
  replayed: boolean
}

type TenantResolution =
  | { tenant: { id: string }; error: null }
  | { tenant: null; error: ProjectsError }

async function resolveTenant(
  organizationId: string,
): Promise<TenantResolution> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

const TEMPLATE_KEY_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

function checkTemplateKey(key: string): ProjectsError | null {
  return TEMPLATE_KEY_REGEX.test(key)
    ? null
    : getError('projects/invalid-template-key')
}

function missingToDescription(missing: MissingReferences): string {
  const parts: string[] = []
  if (missing.workItemTypes.length > 0)
    parts.push(`work item types: ${missing.workItemTypes.join(', ')}`)
  if (missing.workflowStates.length > 0)
    parts.push(`workflow states: ${missing.workflowStates.join(', ')}`)
  if (missing.labels.length > 0)
    parts.push(`labels: ${missing.labels.join(', ')}`)
  return `Missing ${parts.join('; ')}.`
}

function hasMissing(missing: MissingReferences): boolean {
  return (
    missing.workItemTypes.length > 0 ||
    missing.workflowStates.length > 0 ||
    missing.labels.length > 0
  )
}

function parseDefinition(value: unknown): TemplateDefinition | null {
  const parsed = templateDefinitionSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

async function resolveCatalogs(
  organizationId: string,
): Promise<
  | { catalogs: MaterializeCatalogs; error: null }
  | { catalogs: null; error: ProjectsError }
> {
  const [types, states, labelList] = await Promise.all([
    workStructure.listWorkItemTypes(organizationId),
    workStructure.listWorkflowStates(organizationId),
    labels.list(organizationId),
  ])
  if (types.error) return { catalogs: null, error: types.error }
  if (states.error) return { catalogs: null, error: states.error }
  if (labelList.error) return { catalogs: null, error: labelList.error }
  return {
    catalogs: {
      workItemTypes: new Map(
        types.data.map((type) => [
          type.key,
          { id: type.id, hierarchyLevel: type.hierarchyLevel },
        ]),
      ),
      workflowStates: new Map(
        states.data.map((state) => [
          state.key,
          { id: state.id, category: state.category },
        ]),
      ),
      labels: new Map(labelList.data.map((label) => [label.name, label.id])),
    },
    error: null,
  }
}

function planTargetDate(plan: MaterializePlan): number | null {
  const candidates: number[] = []
  for (const phase of plan.phases) {
    if (phase.end !== null) candidates.push(phase.end)
  }
  for (const item of plan.workItems) {
    if (item.dueDate !== null) candidates.push(item.dueDate)
    if (item.plannedFinish !== null) candidates.push(item.plannedFinish)
  }
  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

async function materializeIntoProject(params: {
  organizationId: string
  tenantId: string
  definition: TemplateDefinition
  name: string
  key: string | undefined
  startDate: number
  includeWorkItems: boolean
  includeDependencies: boolean
  includeBudgets: boolean
  templateId: string | null
  templateVersion: number | null
  idempotencyKey: string | null
}): Promise<ServiceResult<InstantiateResult>> {
  const catalogResolution = await resolveCatalogs(params.organizationId)
  if (!catalogResolution.catalogs)
    return { data: null, error: catalogResolution.error }

  const planned = planMaterialization(
    params.definition,
    {
      startDate: params.startDate,
      includeWorkItems: params.includeWorkItems,
      includeDependencies: params.includeDependencies,
      includeBudgets: params.includeBudgets,
    },
    catalogResolution.catalogs,
  )
  if (planned.status === 'invalid-refs') {
    return {
      data: null,
      error: getError('projects/invalid-template-definition', {
        description: planned.message,
      }),
    }
  }
  if (planned.status === 'dependency-cycle') {
    return {
      data: null,
      error: getError('projects/template-dependency-cycle', {
        description: `Cycle: ${planned.cycle.join(' -> ')}.`,
      }),
    }
  }
  if (hasMissing(planned.missing)) {
    return {
      data: null,
      error: getError('projects/template-missing-references', {
        description: missingToDescription(planned.missing),
      }),
    }
  }

  let key = params.key
  if (key !== undefined) {
    if (!projects.isValidProjectKey(key)) {
      return { data: null, error: getError('projects/invalid-project-key') }
    }
    const colliding = await projects.resolveProject(params.tenantId, key)
    if (colliding)
      return { data: null, error: getError('projects/project-key-taken') }
  } else {
    key = await projects.deriveUniqueKey(params.tenantId, params.name)
  }
  const slug = await projects.deriveUniqueSlug(params.tenantId, params.name)

  const settings = params.definition.project ?? {}
  const now = toDbUnixSeconds(nowUnixSeconds())
  const outcome = await repository.instantiateInTransaction({
    tenantId: params.tenantId,
    project: {
      name: params.name,
      key,
      slug,
      description: settings.description ?? null,
      status: settings.status ?? 'planned',
      health: settings.health ?? 'on-track',
      startDate: params.startDate,
      targetDate: planTargetDate(planned.plan),
      defaultWorkItemTypeId: null,
    },
    plan: planned.plan,
    billing:
      params.includeBudgets && settings.billingMethod !== undefined
        ? {
            billingMethod: settings.billingMethod,
            currency: settings.currency,
            fixedFeeAmount: settings.fixedFeeAmount,
          }
        : {},
    templateId: params.templateId,
    templateVersion: params.templateVersion,
    idempotencyKey: params.idempotencyKey,
    now,
  })

  const project = await projects.retrieve(
    params.organizationId,
    outcome.projectId,
  )
  if (project.error || !project.data) {
    return {
      data: null,
      error: project.error ?? getError('projects/project-not-found'),
    }
  }
  return { data: { project: project.data, replayed: outcome.replayed }, error: null }
}

async function captureProjectDefinition(
  organizationId: string,
  tenantId: string,
  source: {
    id: string
    description: string | null
    status: string
    health: string
    startDate: bigint | number | null
    targetDate: bigint | number | null
  },
): Promise<TemplateDefinition> {
  const [milestones, taskLists, customFields, budgets, billing] =
    await Promise.all([
      workStructure.listMilestones(organizationId, source.id),
      workStructure.listTaskLists(organizationId, source.id, false),
      workStructure.listCustomFields(organizationId),
      finance.listBudgets(organizationId, source.id),
      finance.getBilling(organizationId, source.id),
    ])
  if (milestones.error) throw new CaptureError(milestones.error)
  if (taskLists.error) throw new CaptureError(taskLists.error)
  if (customFields.error) throw new CaptureError(customFields.error)
  if (budgets.error) throw new CaptureError(budgets.error)

  const typeKeyById = new Map<string, string>()
  const types = await workStructure.listWorkItemTypes(organizationId)
  if (types.error) throw new CaptureError(types.error)
  for (const type of types.data) typeKeyById.set(type.id, type.key)

  const capturedIssues: CaptureInputs['issues'] = []
  let cursor: string | undefined
  for (;;) {
    const page = await issues.list(organizationId, {
      project: source.id,
      order: 'created',
      limit: 100,
      ...(cursor ? { starting_after: cursor } : {}),
    })
    if (page.error) throw new CaptureError(page.error)
    for (const item of page.data.items) {
      capturedIssues.push({
        id: item.id,
        identifier: item.identifier,
        title: item.title,
        description: item.description,
        stateKey: item.state?.key ?? item.status,
        typeKey: item.typeKey,
        priority: item.priority,
        estimate: item.estimate,
        labelNames: item.labels.map((label) => label.name),
        milestoneId: item.milestone?.id ?? null,
        taskListId: item.taskListId,
        parentIssueId: item.parentIssueId,
        plannedStartDate: item.plannedStartDate,
        plannedFinishDate: item.plannedFinishDate,
        plannedDurationMinutes: item.plannedDurationMinutes,
        dueDate: item.dueDate,
        customFieldKeys: item.customFields.map((field) => field.fieldKey),
      })
    }
    if (!page.data.hasMore || page.data.items.length === 0) break
    cursor = page.data.items[page.data.items.length - 1]?.id
    if (!cursor) break
  }

  const dependencies = await issues.listDependenciesForIssueIds(
    tenantId,
    capturedIssues.map((issue) => issue.id),
  )

  return captureDefinition({
    project: {
      description: source.description,
      status: source.status,
      health: source.health,
      startDate:
        source.startDate === null ? null : Number(source.startDate),
      targetDate:
        source.targetDate === null ? null : Number(source.targetDate),
      billingMethod:
        billing.error || !billing.data
          ? null
          : billing.data.billingMethod,
      billingCurrency:
        billing.error || !billing.data ? null : billing.data.currency,
      billingFixedFeeAmount:
        billing.error || !billing.data ? null : billing.data.fixedFeeAmount,
    },
    phases: milestones.data.map((phase) => ({
      id: phase.id,
      key: phase.key,
      name: phase.name,
      description: phase.description,
      startDate: phase.startDate,
      targetDate: phase.targetDate,
      position: phase.position,
    })),
    taskLists: taskLists.data.map((list) => ({
      id: list.id,
      milestoneId: list.milestoneId,
      name: list.name,
      description: list.description,
      startDate: list.startDate,
      targetDate: list.targetDate,
      position: list.position,
    })),
    issues: capturedIssues,
    dependencies: dependencies.map((link) => ({
      predecessorIssueId: link.predecessorIssueId,
      successorIssueId: link.successorIssueId,
      type: link.type,
      lagMinutes: link.lagMinutes,
    })),
    budgets: budgets.data.map((budget) => ({
      scope: budget.scope,
      milestoneId: budget.milestoneId,
      amountMinor: budget.amountMinor,
      hours: budget.hours,
      thresholdPercent: budget.thresholdPercent,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
    })),
    customFields: customFields.data.map((field) => ({
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      options: Array.isArray(field.options)
        ? (field.options as Array<{ key: string; label: string }>)
        : [],
      required: field.required,
      description: field.description,
      typeKeys: field.typeIds
        .map((typeId) => typeKeyById.get(typeId))
        .filter((typeKey): typeKey is string => typeKey !== undefined),
    })),
  })
}

class CaptureError extends Error {
  constructor(readonly projectsError: ProjectsError) {
    super(projectsError.message)
  }
}

export async function listTemplates(
  organizationId: string,
): Promise<ServiceResult<SerializedProjectTemplate[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listTemplates(resolved.tenant.id)
  return { data: rows.map(serializeProjectTemplate), error: null }
}

export async function createTemplate(
  organizationId: string,
  body: CreateTemplateBody,
): Promise<ServiceResult<SerializedProjectTemplate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }

  const keyError = checkTemplateKey(body.key)
  if (keyError) return { data: null, error: keyError }
  if (await repository.retrieveTemplateByKey(resolved.tenant.id, body.key)) {
    return { data: null, error: getError('projects/template-key-taken') }
  }

  if (body.sourceProjectId !== undefined && body.sourceProjectId !== null) {
    const source = await projects.resolveProject(
      resolved.tenant.id,
      body.sourceProjectId,
    )
    if (!source)
      return { data: null, error: getError('projects/project-not-found') }
  }

  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createTemplate({
    id: generateId('projectTemplate'),
    tenantId: resolved.tenant.id,
    key: body.key,
    name: body.name,
    description: body.description ?? null,
    definition: body.definition,
    sourceProjectId: body.sourceProjectId ?? null,
    versionId: generateId('projectTemplateVersion'),
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeProjectTemplate(row), error: null }
}

export async function retrieveTemplate(
  organizationId: string,
  templateId: string,
): Promise<ServiceResult<SerializedProjectTemplate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveTemplate(
    resolved.tenant.id,
    templateId,
  )
  if (!row)
    return { data: null, error: getError('projects/template-not-found') }
  return { data: serializeProjectTemplate(row), error: null }
}

export async function updateTemplate(
  organizationId: string,
  templateId: string,
  body: UpdateTemplateBody,
): Promise<ServiceResult<SerializedProjectTemplate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  try {
    const row = await repository.updateTemplate(
      resolved.tenant.id,
      templateId,
      {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.definition !== undefined
          ? { definition: body.definition }
          : {}),
        versionId: generateId('projectTemplateVersion'),
        updatedAt: toDbUnixSeconds(nowUnixSeconds()),
      },
    )
    return { data: serializeProjectTemplate(row), error: null }
  } catch (error) {
    if (error instanceof TemplateMissingError) {
      return { data: null, error: getError('projects/template-not-found') }
    }
    throw error
  }
}

export async function removeTemplate(
  organizationId: string,
  templateId: string,
): Promise<ServiceResult<SerializedProjectTemplateTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveTemplate(
    resolved.tenant.id,
    templateId,
  )
  if (!row)
    return { data: null, error: getError('projects/template-not-found') }
  await repository.softDeleteTemplate(resolved.tenant.id, templateId, {
    deletedAt: toDbUnixSeconds(nowUnixSeconds()),
    deletedBy: null,
    reason: null,
  })
  return {
    data: { object: 'projects.project-template', id: templateId, deleted: true },
    error: null,
  }
}

export async function listTemplateVersions(
  organizationId: string,
  templateId: string,
): Promise<ServiceResult<SerializedProjectTemplateVersion[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const template = await repository.retrieveTemplate(
    resolved.tenant.id,
    templateId,
  )
  if (!template)
    return { data: null, error: getError('projects/template-not-found') }
  const rows = await repository.listTemplateVersions(
    resolved.tenant.id,
    templateId,
  )
  return { data: rows.map(serializeProjectTemplateVersion), error: null }
}

export async function saveAsTemplate(
  organizationId: string,
  projectId: string,
  body: SaveAsTemplateBody,
): Promise<ServiceResult<SerializedProjectTemplate>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }

  const keyError = checkTemplateKey(body.key)
  if (keyError) return { data: null, error: keyError }
  if (await repository.retrieveTemplateByKey(resolved.tenant.id, body.key)) {
    return { data: null, error: getError('projects/template-key-taken') }
  }

  const source = await projects.resolveProject(
    resolved.tenant.id,
    projectId,
  )
  if (!source)
    return { data: null, error: getError('projects/project-not-found') }

  try {
    const definition = await captureProjectDefinition(
      organizationId,
      resolved.tenant.id,
      source,
    )
    const now = toDbUnixSeconds(nowUnixSeconds())
    const row = await repository.createTemplate({
      id: generateId('projectTemplate'),
      tenantId: resolved.tenant.id,
      key: body.key,
      name: body.name ?? `${source.name} template`,
      description: body.description ?? source.description,
      definition,
      sourceProjectId: source.id,
      versionId: generateId('projectTemplateVersion'),
      createdAt: now,
      updatedAt: now,
    })
    return { data: serializeProjectTemplate(row), error: null }
  } catch (error) {
    if (error instanceof CaptureError)
      return { data: null, error: error.projectsError }
    throw error
  }
}

export async function previewTemplate(
  organizationId: string,
  templateId: string,
  body: PreviewTemplateBody,
): Promise<ServiceResult<SerializedTemplatePreview>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveTemplate(
    resolved.tenant.id,
    templateId,
  )
  if (!row)
    return { data: null, error: getError('projects/template-not-found') }

  const definition = parseDefinition(row.definition)
  if (!definition) {
    return {
      data: null,
      error: getError('projects/invalid-template-definition'),
    }
  }

  const catalogResolution = await resolveCatalogs(organizationId)
  if (!catalogResolution.catalogs)
    return { data: null, error: catalogResolution.error }

  const planned = planMaterialization(
    definition,
    {
      startDate: body.startDate,
      includeWorkItems: body.includeWorkItems ?? true,
      includeDependencies: body.includeDependencies ?? true,
      includeBudgets: body.includeBudgets ?? true,
    },
    catalogResolution.catalogs,
  )
  if (planned.status === 'invalid-refs') {
    return {
      data: null,
      error: getError('projects/invalid-template-definition', {
        description: planned.message,
      }),
    }
  }
  if (planned.status === 'dependency-cycle') {
    return {
      data: null,
      error: getError('projects/template-dependency-cycle', {
        description: `Cycle: ${planned.cycle.join(' -> ')}.`,
      }),
    }
  }
  return {
    data: serializeTemplatePreview({
      startDate: body.startDate,
      phases: planned.plan.phases.map((phase) => ({
        ref: phase.ref,
        name: phase.name,
        start: phase.start,
        end: phase.end,
      })),
      workItems: planned.plan.workItems.map((item) => ({
        ref: item.ref,
        title: item.title,
        start: item.plannedStart,
        due: item.dueDate,
      })),
      missing: planned.missing,
    }),
    error: null,
  }
}

export async function instantiateTemplate(
  organizationId: string,
  templateId: string,
  body: InstantiateTemplateBody,
): Promise<ServiceResult<InstantiateResult>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveTemplate(
    resolved.tenant.id,
    templateId,
  )
  if (!row)
    return { data: null, error: getError('projects/template-not-found') }

  const definition = parseDefinition(row.definition)
  if (!definition) {
    return {
      data: null,
      error: getError('projects/invalid-template-definition'),
    }
  }

  if (body.idempotencyKey !== undefined) {
    const replay = await repository.findInstantiation(
      resolved.tenant.id,
      templateId,
      body.idempotencyKey,
    )
    if (replay) {
      const project = await projects.retrieve(
        organizationId,
        replay.projectId,
      )
      if (project.error || !project.data) {
        return {
          data: null,
          error: project.error ?? getError('projects/project-not-found'),
        }
      }
      return { data: { project: project.data, replayed: true }, error: null }
    }
  }

  return materializeIntoProject({
    organizationId,
    tenantId: resolved.tenant.id,
    definition,
    name: body.name,
    key: body.key,
    startDate: body.startDate,
    includeWorkItems: body.includeWorkItems ?? true,
    includeDependencies: body.includeDependencies ?? true,
    includeBudgets: body.includeBudgets ?? true,
    templateId,
    templateVersion: row.currentVersion,
    idempotencyKey: body.idempotencyKey ?? null,
  })
}

export async function cloneProject(
  organizationId: string,
  projectId: string,
  body: CloneProjectBody,
): Promise<ServiceResult<InstantiateResult>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const source = await projects.resolveProject(
    resolved.tenant.id,
    projectId,
  )
  if (!source)
    return { data: null, error: getError('projects/project-not-found') }

  try {
    const definition = await captureProjectDefinition(
      organizationId,
      resolved.tenant.id,
      source,
    )
    return materializeIntoProject({
      organizationId,
      tenantId: resolved.tenant.id,
      definition,
      name: body.name,
      key: body.key,
      startDate:
        body.startDate ??
        (source.startDate === null ? nowUnixSeconds() : Number(source.startDate)),
      includeWorkItems: true,
      includeDependencies: true,
      includeBudgets: true,
      templateId: null,
      templateVersion: null,
      idempotencyKey: null,
    })
  } catch (error) {
    if (error instanceof CaptureError)
      return { data: null, error: error.projectsError }
    throw error
  }
}
