import { describe, expect, it } from 'vitest'

import { provisioningRunResponseSchema } from '../provisioning.schemas'
import { serializeRun } from '../provisioning.serializers'

const NOW = BigInt(1_788_163_200)

describe('provisioning run routing audit', () => {
  it('serializes and validates both setup and application-profile provenance', () => {
    const result = serializeRun({
      id: 'prn_1',
      organizationId: 'org_1',
      appId: 'rap_crm',
      subscriptionId: 'sub_1',
      outboxEventId: 'fpe_1',
      trigger: 'app_activation',
      status: 'succeeded',
      manifestVersion: 1,
      provisioningSetupKey: 'jamaica',
      provisioningSelectionType: 'policy',
      provisioningMatchGroupKey: 'country-jm',
      provisioningMatchPriority: 100,
      provisioningMatchedFields: ['country'],
      applicationProvisioningProfileId: 'apppr_jamaica-enterprise',
      applicationProvisioningProfileKey: 'jamaica-enterprise',
      applicationProvisioningSelectionType: 'policy',
      applicationProvisioningMatchGroupKey: 'jamaica-enterprise',
      applicationProvisioningMatchPriority: 200,
      applicationProvisioningMatchedFields: ['setup', 'plan'],
      financeRevisionId: 'pmr_finance_2',
      financeRevision: 2,
      applicationRevisionId: 'pmr_crm_4',
      applicationRevision: 4,
      attemptCount: 1,
      availableAt: NOW,
      startedAt: NOW,
      completedAt: NOW + BigInt(1),
      lastError: null,
      provisioningRunSteps: [],
      createdAt: NOW,
      updatedAt: NOW + BigInt(1),
    })

    expect(result).toMatchObject({
      provisioning_setup_key: 'jamaica',
      provisioning_selection_type: 'policy',
      provisioning_match_group_key: 'country-jm',
      provisioning_match_priority: 100,
      provisioning_matched_fields: ['country'],
      application_provisioning_profile_id: 'apppr_jamaica-enterprise',
      application_provisioning_profile_key: 'jamaica-enterprise',
      application_provisioning_selection_type: 'policy',
      application_provisioning_match_group_key: 'jamaica-enterprise',
      application_provisioning_match_priority: 200,
      application_provisioning_matched_fields: ['setup', 'plan'],
    })
    expect(provisioningRunResponseSchema.safeParse(result)).toMatchObject({
      success: true,
    })
  })
})
