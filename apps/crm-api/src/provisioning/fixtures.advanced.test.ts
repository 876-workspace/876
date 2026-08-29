import { beforeEach, describe, expect, it, vi } from 'vitest'

const { priorities, categories, requestForms } = vi.hoisted(() => ({
  priorities: { ensureProvisioned: vi.fn() },
  categories: { ensureProvisionedCategory: vi.fn() },
  requestForms: { retrieveProvisioned: vi.fn(), ensureProvisioned: vi.fn() },
}))

vi.mock('../modules/priorities/index.js', () => priorities)
vi.mock('../modules/categories/index.js', () => categories)
vi.mock(
  '../modules/request-forms/request-forms.provisioning.js',
  () => requestForms
)

const { ensureCrmWorkspaceFixtures } = await import('./fixtures.js')

describe('ensureCrmWorkspaceFixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestForms.retrieveProvisioned.mockResolvedValue(null)
    priorities.ensureProvisioned.mockResolvedValue({ id: 'crm_pri_normal' })
    categories.ensureProvisionedCategory.mockResolvedValue({
      id: 'crm_cat_support',
    })
    requestForms.ensureProvisioned.mockResolvedValue({ id: 'crm_form_support' })
  })

  it('provisions nothing when no fixture is requested', async () => {
    await ensureCrmWorkspaceFixtures('crm_tnt_1', [])

    expect(requestForms.retrieveProvisioned).not.toHaveBeenCalled()
    expect(requestForms.ensureProvisioned).not.toHaveBeenCalled()
    expect(priorities.ensureProvisioned).not.toHaveBeenCalled()
    expect(categories.ensureProvisionedCategory).not.toHaveBeenCalled()
  })

  it('creates the 876 support form against the requested tenant', async () => {
    await ensureCrmWorkspaceFixtures('crm_tnt_1', ['876_SUPPORT'])

    expect(requestForms.ensureProvisioned).toHaveBeenCalledTimes(1)
    expect(requestForms.ensureProvisioned).toHaveBeenCalledWith(
      'crm_tnt_1',
      expect.objectContaining({
        provisioningKey: '876-support',
        name: '876 Support',
        slug: '876-support',
        placement: 'EMBEDDED',
        defaultCategoryId: 'crm_cat_support',
        defaultPriorityId: 'crm_pri_normal',
      })
    )
  })

  it('maps the support form fields onto the canonical request mappings', async () => {
    await ensureCrmWorkspaceFixtures('crm_tnt_1', ['876_SUPPORT'])

    const input = requestForms.ensureProvisioned.mock.calls[0]?.[1] as {
      definition: {
        fields: { key: string; mapping: string; required: boolean }[]
      }
    }

    expect(
      input.definition.fields.map((field) => [field.key, field.mapping])
    ).toEqual([
      ['subject', 'REQUEST_SUBJECT'],
      ['description', 'REQUEST_DESCRIPTION'],
    ])
    expect(input.definition.fields.every((field) => field.required)).toBe(true)
  })

  it('short-circuits when the support form is already provisioned', async () => {
    requestForms.retrieveProvisioned.mockResolvedValue({
      id: 'crm_form_support',
      deletedAt: null,
    })

    await ensureCrmWorkspaceFixtures('crm_tnt_1', ['876_SUPPORT'])

    expect(requestForms.ensureProvisioned).not.toHaveBeenCalled()
    expect(priorities.ensureProvisioned).not.toHaveBeenCalled()
    expect(categories.ensureProvisionedCategory).not.toHaveBeenCalled()
  })

  it('repairs a soft-deleted support form rather than leaving it deleted', async () => {
    requestForms.retrieveProvisioned.mockResolvedValue({
      id: 'crm_form_support',
      deletedAt: new Date(),
    })

    await ensureCrmWorkspaceFixtures('crm_tnt_1', ['876_SUPPORT'])

    expect(requestForms.ensureProvisioned).toHaveBeenCalledTimes(1)
  })

  it('provisions a repeated fixture request only once', async () => {
    await ensureCrmWorkspaceFixtures('crm_tnt_1', [
      '876_SUPPORT',
      '876_SUPPORT',
    ])

    expect(requestForms.ensureProvisioned).toHaveBeenCalledTimes(1)
  })

  it('does not swallow an unexpected provisioning failure', async () => {
    requestForms.ensureProvisioned.mockRejectedValue(new Error('db down'))

    await expect(
      ensureCrmWorkspaceFixtures('crm_tnt_1', ['876_SUPPORT'])
    ).rejects.toThrow('db down')
  })
})
