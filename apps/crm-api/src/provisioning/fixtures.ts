import * as categories from '../modules/categories/index.js'
import * as priorities from '../modules/priorities/index.js'
import * as requestForms from '../modules/request-forms/request-forms.provisioning.js'
import type { CrmWorkspaceFixture } from '../types/provisioning.js'

const SUPPORT_FIXTURE_PRIORITY_KEY = 'normal'
const SUPPORT_FIXTURE_CATEGORY_KEY = 'support'
const SUPPORT_FORM_PROVISIONING_KEY = '876-support'

async function ensure876SupportFixture(tenantId: string) {
  const existing = await requestForms.retrieveProvisioned(
    tenantId,
    SUPPORT_FORM_PROVISIONING_KEY
  )
  if (existing && !existing.deletedAt) return

  const priority = await priorities.ensureProvisioned(tenantId, {
    provisioningKey: SUPPORT_FIXTURE_PRIORITY_KEY,
    name: 'Normal',
    description: null,
    color: null,
    icon: null,
    weight: 20,
    sortOrder: 20,
    isDefault: true,
  })

  const category = await categories.ensureProvisionedCategory(tenantId, {
    provisioningKey: SUPPORT_FIXTURE_CATEGORY_KEY,
    name: 'Support',
    description: null,
    color: null,
    icon: null,
    sortOrder: 1,
    isActive: true,
    defaultPriorityId: null,
  })

  await requestForms.ensureProvisioned(tenantId, {
    provisioningKey: SUPPORT_FORM_PROVISIONING_KEY,
    name: '876 Support',
    slug: '876-support',
    description: 'Raise a request with the 876 support team.',
    placement: 'EMBEDDED',
    definition: {
      fields: [
        {
          id: 'subject',
          key: 'subject',
          type: 'TEXT',
          label: 'What can we help with?',
          required: true,
          mapping: 'REQUEST_SUBJECT',
          placeholder: 'Briefly describe what you need help with',
        },
        {
          id: 'description',
          key: 'description',
          type: 'LONG_TEXT',
          label: 'Details',
          required: true,
          mapping: 'REQUEST_DESCRIPTION',
          placeholder: 'Add the details that will help the 876 team respond',
        },
      ],
    },
    defaultCategoryId: category.id,
    defaultSubcategoryId: null,
    defaultTeamId: null,
    defaultPriorityId: priority.id,
    confirmationTitle: 'Request received',
    confirmationMessage: 'The 876 support team will follow up on this request.',
  })
}

export async function ensureCrmWorkspaceFixtures(
  tenantId: string,
  fixtures: readonly CrmWorkspaceFixture[]
) {
  for (const fixture of new Set(fixtures)) {
    switch (fixture) {
      case '876_SUPPORT':
        await ensure876SupportFixture(tenantId)
        break
    }
  }
}
