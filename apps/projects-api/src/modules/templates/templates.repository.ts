import { prisma } from '../../db/index.js'
import { generateId } from '../../platform/ids.js'
import { nullableToDbUnixSeconds } from '../../platform/timestamps.js'
import type { MaterializePlan } from './templates.materialize.js'
import type {
  ProjectTemplateRow,
  ProjectTemplateVersionRow,
} from './templates.serializers.js'

export type TemplateTransaction = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

export async function listTemplates(
  tenantId: string,
): Promise<ProjectTemplateRow[]> {
  const rows = await prisma.projectTemplate.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
  })
  return rows as unknown as ProjectTemplateRow[]
}

export async function retrieveTemplate(
  tenantId: string,
  id: string,
): Promise<ProjectTemplateRow | null> {
  const row = await prisma.projectTemplate.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
  return row as unknown as ProjectTemplateRow | null
}

export async function retrieveTemplateByKey(
  tenantId: string,
  key: string,
): Promise<ProjectTemplateRow | null> {
  const row = await prisma.projectTemplate.findFirst({
    where: { tenantId, key, deletedAt: null },
  })
  return row as unknown as ProjectTemplateRow | null
}

export async function createTemplate(params: {
  id: string
  tenantId: string
  key: string
  name: string
  description: string | null
  definition: unknown
  sourceProjectId: string | null
  versionId: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<ProjectTemplateRow> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.projectTemplate.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        key: params.key,
        name: params.name,
        description: params.description,
        currentVersion: 1,
        definition: params.definition as never,
        sourceProjectId: params.sourceProjectId,
        createdAt: params.createdAt,
        updatedAt: params.updatedAt,
      },
    })
    await tx.projectTemplateVersion.create({
      data: {
        id: params.versionId,
        tenantId: params.tenantId,
        templateId: params.id,
        version: 1,
        definition: params.definition as never,
        createdAt: params.createdAt,
      },
    })
    return row as unknown as ProjectTemplateRow
  })
}

export async function updateTemplate(
  tenantId: string,
  id: string,
  params: {
    name?: string
    description?: string | null
    definition?: unknown
    versionId: string
    updatedAt: bigint
  },
): Promise<ProjectTemplateRow> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.projectTemplate.findFirst({
      where: { tenantId, id, deletedAt: null },
    })
    if (!existing) throw new TemplateMissingError()
    const nextVersion = existing.currentVersion + 1
    const definition = params.definition ?? existing.definition
    await tx.projectTemplateVersion.create({
      data: {
        id: params.versionId,
        tenantId,
        templateId: id,
        version: nextVersion,
        definition: definition as never,
        createdAt: params.updatedAt,
      },
    })
    const row = await tx.projectTemplate.update({
      where: { id },
      data: {
        ...(params.name !== undefined ? { name: params.name } : {}),
        ...(params.description !== undefined
          ? { description: params.description }
          : {}),
        ...(params.definition !== undefined
          ? { definition: params.definition as never }
          : {}),
        currentVersion: nextVersion,
        updatedAt: params.updatedAt,
      },
    })
    return row as unknown as ProjectTemplateRow
  })
}

export class TemplateMissingError extends Error {}

export async function softDeleteTemplate(
  tenantId: string,
  id: string,
  params: { deletedAt: bigint; deletedBy: string | null; reason: string | null },
): Promise<void> {
  await prisma.projectTemplate.updateMany({
    where: { tenantId, id, deletedAt: null },
    data: {
      deletedAt: params.deletedAt,
      deletedBy: params.deletedBy,
      deletionReason: params.reason,
      updatedAt: params.deletedAt,
    },
  })
}

export async function listTemplateVersions(
  tenantId: string,
  templateId: string,
): Promise<ProjectTemplateVersionRow[]> {
  const rows = await prisma.projectTemplateVersion.findMany({
    where: { tenantId, templateId },
    orderBy: { version: 'desc' },
  })
  return rows as unknown as ProjectTemplateVersionRow[]
}

export async function findInstantiation(
  tenantId: string,
  templateId: string,
  idempotencyKey: string,
): Promise<{ projectId: string; templateVersion: number } | null> {
  const row = await prisma.projectTemplateInstantiation.findFirst({
    where: { tenantId, templateId, idempotencyKey },
    select: { projectId: true, templateVersion: true },
  })
  return row
}

export type InstantiateProjectInput = {
  name: string
  key: string
  slug: string
  description: string | null
  status: string
  health: string
  startDate: number | null
  targetDate: number | null
  defaultWorkItemTypeId: string | null
}

export type InstantiateBillingInput = {
  billingMethod?: string
  currency?: string
  fixedFeeAmount?: number | null
}

export type InstantiateTransactionInput = {
  tenantId: string
  project: InstantiateProjectInput
  plan: MaterializePlan
  billing: InstantiateBillingInput
  templateId: string | null
  templateVersion: number | null
  idempotencyKey: string | null
  now: bigint
}

export type InstantiateTransactionResult = {
  projectId: string
  replayed: boolean
}

/**
 * Materializes one planned project copy inside a single database
 * transaction. Callers validate every catalog reference before invoking
 * this function, so a failure here rolls back the whole copy instead of
 * leaving a partially written project behind.
 */
export async function instantiateInTransaction(
  input: InstantiateTransactionInput,
): Promise<InstantiateTransactionResult> {
  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey !== null && input.templateId !== null) {
      const replay = await tx.projectTemplateInstantiation.findFirst({
        where: {
          tenantId: input.tenantId,
          templateId: input.templateId,
          idempotencyKey: input.idempotencyKey,
        },
        select: { projectId: true },
      })
      if (replay) return { projectId: replay.projectId, replayed: true }
    }

    const projectId = generateId('project')
    await tx.project.create({
      data: {
        id: projectId,
        tenantId: input.tenantId,
        name: input.project.name,
        key: input.project.key,
        slug: input.project.slug,
        description: input.project.description,
        status: input.project.status,
        health: input.project.health,
        startDate: nullableToDbUnixSeconds(input.project.startDate),
        targetDate: nullableToDbUnixSeconds(input.project.targetDate),
        nextIssueNumber: input.plan.workItems.length + 1,
        defaultWorkItemTypeId: input.project.defaultWorkItemTypeId,
        position: 0,
        createdAt: input.now,
        updatedAt: input.now,
      },
    })

    for (const [fieldIndex, field] of input.plan.customFields.entries()) {
      const existing = await tx.customField.findFirst({
        where: { tenantId: input.tenantId, key: field.key },
        select: { id: true },
      })
      if (existing) continue
      await tx.customField.create({
        data: {
          id: generateId('customField'),
          tenantId: input.tenantId,
          key: field.key,
          label: field.label,
          fieldType: field.fieldType,
          options:
            field.options.length > 0 ? (field.options as never) : undefined,
          required: field.required,
          description: field.description,
          position: fieldIndex,
          createdAt: input.now,
          updatedAt: input.now,
          types: {
            createMany: {
              data: field.workItemTypeIds.map((typeId) => ({ typeId })),
            },
          },
        },
      })
    }

    const milestoneIdByPhase: Array<string | null> = []
    for (const phase of input.plan.phases) {
      const milestone = await tx.milestone.create({
        data: {
          id: generateId('milestone'),
          tenantId: input.tenantId,
          projectId,
          key: phase.key,
          name: phase.name,
          description: phase.description,
          status: 'open',
          startDate: nullableToDbUnixSeconds(phase.start),
          targetDate: nullableToDbUnixSeconds(phase.end),
          position: phase.position,
          createdAt: input.now,
          updatedAt: input.now,
        },
      })
      milestoneIdByPhase.push(milestone.id)
    }

    const taskListIdByIndex: Array<string | null> = []
    for (const list of input.plan.taskLists) {
      const taskList = await tx.taskList.create({
        data: {
          id: generateId('taskList'),
          tenantId: input.tenantId,
          projectId,
          milestoneId:
            list.phaseIndex === null
              ? null
              : (milestoneIdByPhase[list.phaseIndex] ?? null),
          name: list.name,
          description: list.description,
          startDate: nullableToDbUnixSeconds(list.start),
          targetDate: nullableToDbUnixSeconds(list.end),
          position: list.position,
          createdAt: input.now,
          updatedAt: input.now,
        },
      })
      taskListIdByIndex.push(taskList.id)
    }

    const issueIdByPlanIndex: string[] = []
    for (const [planIndex, item] of input.plan.workItems.entries()) {
      const number = planIndex + 1
      const issueId = generateId('issue')
      await tx.issue.create({
        data: {
          id: issueId,
          tenantId: input.tenantId,
          projectId,
          number,
          identifier: `${input.project.key}-${number}`,
          title: item.title,
          description: item.description,
          status: item.stateKey,
          workflowStateId: item.workflowStateId,
          typeKey: item.typeKey,
          workItemTypeId: item.workItemTypeId,
          milestoneId:
            item.phaseIndex === null
              ? null
              : (milestoneIdByPhase[item.phaseIndex] ?? null),
          taskListId:
            item.taskListIndex === null
              ? null
              : (taskListIdByIndex[item.taskListIndex] ?? null),
          priority: item.priority,
          parentIssueId:
            item.parentPlanIndex === null
              ? null
              : (issueIdByPlanIndex[item.parentPlanIndex] ?? null),
          estimate: item.estimate,
          dueDate: nullableToDbUnixSeconds(item.dueDate),
          plannedStartDate: nullableToDbUnixSeconds(item.plannedStart),
          plannedFinishDate: nullableToDbUnixSeconds(item.plannedFinish),
          plannedDurationMinutes: item.plannedDurationMinutes,
          position: item.position,
          startedAt:
            item.statusCategory === 'started' ? input.now : null,
          completedAt:
            item.statusCategory === 'completed' ? input.now : null,
          canceledAt:
            item.statusCategory === 'canceled' ? input.now : null,
          createdAt: input.now,
          updatedAt: input.now,
        },
      })
      issueIdByPlanIndex.push(issueId)
      await tx.issueEvent.create({
        data: {
          id: generateId('issueEvent'),
          tenantId: input.tenantId,
          issueId,
          type: 'created',
          fromValue: null,
          toValue: `${input.project.key}-${number}`,
          createdAt: input.now,
        },
      })
      if (item.labelIds.length > 0) {
        await tx.issueLabel.createMany({
          data: item.labelIds.map((labelId) => ({
            issueId,
            labelId,
          })),
        })
      }
    }

    for (const link of input.plan.dependencies) {
      const predecessorIssueId = issueIdByPlanIndex[link.fromPlanIndex]
      const successorIssueId = issueIdByPlanIndex[link.toPlanIndex]
      if (!predecessorIssueId || !successorIssueId) continue
      await tx.issueDependency.create({
        data: {
          id: generateId('issueDependency'),
          tenantId: input.tenantId,
          predecessorIssueId,
          successorIssueId,
          type: link.type,
          lagMinutes: link.lagMinutes,
          createdAt: input.now,
        },
      })
    }

    if (input.billing.billingMethod !== undefined) {
      await tx.projectBilling.create({
        data: {
          id: generateId('projectBilling'),
          tenantId: input.tenantId,
          projectId,
          billingMethod: input.billing.billingMethod,
          currency: input.billing.currency ?? 'USD',
          billingCustomerId: null,
          fixedFeeAmount: input.billing.fixedFeeAmount ?? null,
          createdAt: input.now,
          updatedAt: input.now,
        },
      })
    }

    for (const budget of input.plan.budgets) {
      await tx.budget.create({
        data: {
          id: generateId('budget'),
          tenantId: input.tenantId,
          projectId,
          scope: budget.scope,
          milestoneId:
            budget.phaseIndex === null
              ? null
              : (milestoneIdByPhase[budget.phaseIndex] ?? null),
          userId: null,
          amountMinor: budget.amountMinor,
          hours: budget.hours,
          thresholdPercent: budget.thresholdPercent,
          periodStart: nullableToDbUnixSeconds(budget.periodStart),
          periodEnd: nullableToDbUnixSeconds(budget.periodEnd),
          createdAt: input.now,
          updatedAt: input.now,
        },
      })
    }

    if (
      input.idempotencyKey !== null &&
      input.templateId !== null &&
      input.templateVersion !== null
    ) {
      await tx.projectTemplateInstantiation.create({
        data: {
          id: generateId('projectTemplateInstantiation'),
          tenantId: input.tenantId,
          templateId: input.templateId,
          templateVersion: input.templateVersion,
          idempotencyKey: input.idempotencyKey,
          projectId,
          createdAt: input.now,
        },
      })
    }

    return { projectId, replayed: false }
  })
}
