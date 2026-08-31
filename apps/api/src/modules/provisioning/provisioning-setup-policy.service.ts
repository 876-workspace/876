import {
  PROVISIONING_SERVICE_ENTITLEMENTS,
  type ProvisioningSetupPolicy,
} from '@876/core/types/provisioning-policy'

import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './provisioning-setup-policy.repository'
import type { ProvisioningSetupPolicyReplace } from './provisioning-setup-policy.schemas'

const ENTERPRISE_APP_SLUG = '876-enterprise'
const SERVICE_TARGET_KEYS = new Set<string>(
  PROVISIONING_SERVICE_ENTITLEMENTS.map((entry) => entry.target_key)
)

function notFound(): never {
  throw new AppHttpError({
    code: 'provisioning/setup-not-found',
    message: 'Provisioning setup was not found.',
    httpStatus: 404,
  })
}

function serializePolicy(
  row: NonNullable<Awaited<ReturnType<typeof repository.findPolicySetupByKey>>>
): ProvisioningSetupPolicy {
  return {
    object: 'provisioning_setup_policy',
    setup_id: row.id,
    setup_key: row.key,
    conditions: row.conditions.map((condition) => ({
      object: 'provisioning_setup_condition',
      id: condition.id,
      group_key: condition.groupKey,
      field: condition.field as ProvisioningSetupPolicy['conditions'][number]['field'],
      operator:
        condition.operator as ProvisioningSetupPolicy['conditions'][number]['operator'],
      value: condition.value,
      priority: condition.priority,
      created_at: Number(condition.createdAt),
      updated_at: Number(condition.updatedAt),
    })),
    entitlements: row.entitlements.map((entitlement) => ({
      object: 'provisioning_setup_entitlement',
      id: entitlement.id,
      target_type:
        entitlement.targetType as ProvisioningSetupPolicy['entitlements'][number]['target_type'],
      target_key: entitlement.targetKey,
      enabled: entitlement.enabled,
      created_at: Number(entitlement.createdAt),
      updated_at: Number(entitlement.updatedAt),
    })),
    updated_at: Number(row.updatedAt),
  }
}

function withRequiredEnterprise(
  entitlements: ProvisioningSetupPolicyReplace['entitlements']
): ProvisioningSetupPolicyReplace['entitlements'] {
  const enterprise = entitlements.find(
    (entitlement) =>
      entitlement.target_type === 'application' &&
      entitlement.target_key === ENTERPRISE_APP_SLUG
  )

  if (enterprise && !enterprise.enabled) {
    throw new AppHttpError({
      code: 'provisioning/enterprise-entitlement-required',
      message:
        '876 Enterprise is a base organization entitlement and cannot be disabled.',
      httpStatus: 400,
    })
  }

  if (enterprise) return entitlements

  return [
    ...entitlements,
    {
      target_type: 'application',
      target_key: ENTERPRISE_APP_SLUG,
      enabled: true,
    },
  ]
}

async function validateEntitlements(
  entitlements: ProvisioningSetupPolicyReplace['entitlements']
): Promise<void> {
  for (const entitlement of entitlements) {
    if (entitlement.target_type === 'service') {
      if (!SERVICE_TARGET_KEYS.has(entitlement.target_key)) {
        throw new AppHttpError({
          code: 'provisioning/unknown-service-entitlement',
          message: `Unknown provisioning service entitlement: ${entitlement.target_key}.`,
          httpStatus: 400,
        })
      }
      continue
    }

    const app = await repository.findPolicyAppBySlug(entitlement.target_key)
    if (!app || app.appKind === 'internal') {
      throw new AppHttpError({
        code: 'provisioning/unknown-application-entitlement',
        message: `Unknown organization application entitlement: ${entitlement.target_key}.`,
        httpStatus: 400,
      })
    }
  }
}

export async function retrieveSetupPolicy(
  setupKey: string
): Promise<ProvisioningSetupPolicy> {
  const row = await repository.findPolicySetupByKey(setupKey)
  if (!row) return notFound()
  return serializePolicy(row)
}

export async function replaceSetupPolicy(
  setupKey: string,
  body: ProvisioningSetupPolicyReplace
): Promise<ProvisioningSetupPolicy> {
  const setup = await repository.findPolicySetupByKey(setupKey)
  if (!setup) return notFound()

  const entitlements = withRequiredEnterprise(body.entitlements)
  await validateEntitlements(entitlements)

  const now = BigInt(nowUnixSeconds())
  const row = await repository.replaceSetupPolicy({
    setupId: setup.id,
    conditions: body.conditions.map((condition) => ({
      id: generateId('provisioningSetupCondition'),
      groupKey: condition.group_key,
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      priority: condition.priority,
      now,
    })),
    entitlements: entitlements.map((entitlement) => ({
      id: generateId('provisioningSetupEntitlement'),
      targetType: entitlement.target_type,
      targetKey: entitlement.target_key,
      enabled: entitlement.enabled,
      now,
    })),
    now,
  })
  if (!row) return notFound()

  return serializePolicy(row)
}
