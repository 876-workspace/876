import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as apiKeys from './api-keys'
import * as apps from './apps'
import * as billing from './billing'
import * as billingIntegrations from './billing-integrations'
import * as features from './features'
import * as orgs from './orgs'
import * as prices from './prices'
import { provisioningRuns } from './provisioning-runs'
import * as products from './products'
import * as reservedUsernames from './reserved-usernames'
import * as roles from './roles'
import * as users from './users'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./request', () => ({ request: requestMock }))

type RequestCase = {
  name: string
  act: () => unknown
  url: string
  init?: RequestInit
}

const EMPTY = {} as never

const cases: RequestCase[] = [
  {
    name: 'creates an API key with default parameters',
    act: () => apiKeys.create('app /1'),
    url: '/api/apps/app%20%2F1/api-keys',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates an API key',
    act: () => apiKeys.update('app /1', 'key /1', { name: null }),
    url: '/api/apps/app%20%2F1/api-keys/key%20%2F1',
    init: { method: 'PATCH', body: '{"name":null}' },
  },
  {
    name: 'revokes an API key',
    act: () => apiKeys.revoke('app /1', 'key /1'),
    url: '/api/apps/app%20%2F1/api-keys/key%20%2F1/revoke',
    init: { method: 'POST' },
  },
  {
    name: 'deletes an API key',
    act: () => apiKeys.del('app /1', 'key /1'),
    url: '/api/apps/app%20%2F1/api-keys/key%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates an app',
    act: () => apps.create(EMPTY),
    url: '/api/apps',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates an app',
    act: () => apps.update('app /1', EMPTY),
    url: '/api/apps/app%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes an app',
    act: () => apps.remove('app /1'),
    url: '/api/apps/app%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a billing account',
    act: () => billing.createAccount(EMPTY),
    url: '/api/billing/accounts',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'creates a customer through the Billing integration boundary',
    act: () =>
      billingIntegrations.createCustomer('org /1', {
        name: 'Acme',
        customerKind: 'BUSINESS',
      }),
    url: '/api/billing/integrations/organizations/org%20%2F1/customers',
    init: {
      method: 'POST',
      body: '{"name":"Acme","customerKind":"BUSINESS"}',
    },
  },
  {
    name: 'updates a billing account',
    act: () => billing.updateAccount('acct /1', EMPTY),
    url: '/api/billing/accounts/acct%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a billing account',
    act: () => billing.deleteAccount('acct /1'),
    url: '/api/billing/accounts/acct%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a billing subscription',
    act: () => billing.createSubscription(EMPTY),
    url: '/api/billing/subscriptions',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a billing subscription',
    act: () => billing.updateSubscription('sub /1', EMPTY),
    url: '/api/billing/subscriptions/sub%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a billing subscription',
    act: () => billing.deleteSubscription('sub /1'),
    url: '/api/billing/subscriptions/sub%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a billing subscription item',
    act: () => billing.createSubscriptionItem('sub /1', EMPTY),
    url: '/api/billing/subscriptions/sub%20%2F1/items',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a billing subscription item',
    act: () => billing.updateSubscriptionItem('sub /1', 'item /1', EMPTY),
    url: '/api/billing/subscriptions/sub%20%2F1/items/item%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a billing subscription item',
    act: () => billing.deleteSubscriptionItem('sub /1', 'item /1'),
    url: '/api/billing/subscriptions/sub%20%2F1/items/item%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'retries a provisioning run',
    act: () => provisioningRuns.retry('run /1'),
    url: '/api/provisioning/runs/run%20%2F1/retry',
    init: { method: 'POST' },
  },
  {
    name: 'reconciles provisioning runs for an application and organization',
    act: () =>
      provisioningRuns.reconcile({
        app_id: 'app_1',
        organization_id: 'org_1',
      }),
    url: '/api/provisioning/runs/reconcile',
    init: {
      method: 'POST',
      body: '{"app_id":"app_1","organization_id":"org_1"}',
    },
  },
  {
    name: 'creates a feature',
    act: () => features.create(EMPTY),
    url: '/api/features',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a feature',
    act: () => features.update('feat /1', EMPTY),
    url: '/api/features/feat%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a feature',
    act: () => features.del('feat /1'),
    url: '/api/features/feat%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'grants an organization feature',
    act: () => features.grantOrg('org /1', EMPTY),
    url: '/api/features/organizations/org%20%2F1',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates an organization feature',
    act: () => features.updateOrg('org /1', 'feat /1', EMPTY),
    url: '/api/features/organizations/org%20%2F1/feat%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'revokes an organization feature',
    act: () => features.revokeOrg('org /1', 'feat /1'),
    url: '/api/features/organizations/org%20%2F1/feat%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'grants a user feature',
    act: () => features.grantUser('user /1', EMPTY),
    url: '/api/features/users/user%20%2F1',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a user feature',
    act: () => features.updateUser('user /1', 'feat /1', EMPTY),
    url: '/api/features/users/user%20%2F1/feat%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'revokes a user feature',
    act: () => features.revokeUser('user /1', 'feat /1'),
    url: '/api/features/users/user%20%2F1/feat%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates an organization',
    act: () => orgs.create(EMPTY),
    url: '/api/organizations',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates an organization',
    act: () => orgs.update('org /1', EMPTY),
    url: '/api/organizations/org%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes an organization',
    act: () => orgs.del('org /1'),
    url: '/api/organizations/org%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'purges an organization',
    act: () => orgs.purge('org /1'),
    url: '/api/organizations/org%20%2F1/purge',
    init: { method: 'DELETE' },
  },
  {
    name: 'lists organization invites',
    act: () => orgs.listInvites('org /1'),
    url: '/api/organizations/org%20%2F1/invites',
  },
  {
    name: 'creates an organization invite',
    act: () => orgs.createInvite('org /1', EMPTY),
    url: '/api/organizations/org%20%2F1/invites',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'revokes an organization invite',
    act: () => orgs.revokeInvite('org /1', 'invite /1'),
    url: '/api/organizations/org%20%2F1/invites/invite%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'updates an organization subscription',
    act: () =>
      orgs.updateSubscription('org /1', 'app /1', {
        status: 'blocked',
        cancel_at_period_end: true,
      }),
    url: '/api/organizations/org%20%2F1/apps/app%20%2F1',
    init: {
      method: 'PATCH',
      body: '{"status":"blocked","cancel_at_period_end":true}',
    },
  },
  {
    name: 'creates a price',
    act: () => prices.create('product /1', EMPTY),
    url: '/api/products/product%20%2F1/prices',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a price',
    act: () => prices.retrieve('product /1', 'price /1'),
    url: '/api/products/product%20%2F1/prices/price%20%2F1',
  },
  {
    name: 'updates a price',
    act: () => prices.update('product /1', 'price /1', EMPTY),
    url: '/api/products/product%20%2F1/prices/price%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'archives a price',
    act: () => prices.archive('product /1', 'price /1'),
    url: '/api/products/product%20%2F1/prices/price%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a product',
    act: () => products.create(EMPTY),
    url: '/api/products',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a product',
    act: () => products.update('product /1', EMPTY),
    url: '/api/products/product%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'replaces product modules',
    act: () => products.replaceModules('product /1', { module_ids: ['mod_1'] }),
    url: '/api/products/product%20%2F1/modules',
    init: { method: 'PUT', body: '{"module_ids":["mod_1"]}' },
  },
  {
    name: 'archives a product',
    act: () => products.archive('product /1'),
    url: '/api/products/product%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a nested product price',
    act: () => products.createPrice('product /1', EMPTY),
    url: '/api/products/product%20%2F1/prices',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a nested product price',
    act: () => products.updatePrice('product /1', 'price /1', EMPTY),
    url: '/api/products/product%20%2F1/prices/price%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'archives a nested product price',
    act: () => products.archivePrice('product /1', 'price /1'),
    url: '/api/products/product%20%2F1/prices/price%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'lists reserved usernames',
    act: () => reservedUsernames.list(),
    url: '/api/reserved-usernames',
  },
  {
    name: 'creates a reserved username',
    act: () => reservedUsernames.create(EMPTY),
    url: '/api/reserved-usernames',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'deletes a reserved username',
    act: () => reservedUsernames.del('name /1'),
    url: '/api/reserved-usernames/name%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a role',
    act: () => roles.create(EMPTY),
    url: '/api/roles',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a role',
    act: () => roles.update('role /1', EMPTY),
    url: '/api/roles/role%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a role',
    act: () => roles.del('role /1'),
    url: '/api/roles/role%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a user',
    act: () => users.create(EMPTY),
    url: '/api/users',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'searches users',
    act: () => users.search('name / email'),
    url: '/api/users/search?q=name%20%2F%20email',
  },
  {
    name: 'sets a user role',
    act: () => users.setRole('user /1', 'support'),
    url: '/api/users/user%20%2F1/role',
    init: { method: 'PATCH', body: '{"role":"support"}' },
  },
  {
    name: 'updates a user',
    act: () => users.update('user /1', EMPTY),
    url: '/api/users/user%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a user',
    act: () => users.del('user /1'),
    url: '/api/users/user%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'purges a user',
    act: () => users.purge('user /1'),
    url: '/api/users/user%20%2F1/purge',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a user profile',
    act: () => users.createProfile('user /1', EMPTY),
    url: '/api/users/user%20%2F1/profile',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'retrieves a user profile',
    act: () => users.retrieveProfile('user /1'),
    url: '/api/users/user%20%2F1/profile',
  },
  {
    name: 'updates a user profile',
    act: () => users.updateProfile('user /1', EMPTY),
    url: '/api/users/user%20%2F1/profile',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a user profile',
    act: () => users.deleteProfile('user /1'),
    url: '/api/users/user%20%2F1/profile',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a user address',
    act: () => users.createAddress('user /1', EMPTY),
    url: '/api/users/user%20%2F1/addresses',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a user address',
    act: () => users.updateAddress('user /1', 'address /1', EMPTY),
    url: '/api/users/user%20%2F1/addresses/address%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a user address',
    act: () => users.deleteAddress('user /1', 'address /1'),
    url: '/api/users/user%20%2F1/addresses/address%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'creates a user contact',
    act: () => users.createContact('user /1', EMPTY),
    url: '/api/users/user%20%2F1/contacts',
    init: { method: 'POST', body: '{}' },
  },
  {
    name: 'updates a user contact',
    act: () => users.updateContact('user /1', 'contact /1', EMPTY),
    url: '/api/users/user%20%2F1/contacts/contact%20%2F1',
    init: { method: 'PATCH', body: '{}' },
  },
  {
    name: 'deletes a user contact',
    act: () => users.deleteContact('user /1', 'contact /1'),
    url: '/api/users/user%20%2F1/contacts/contact%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'lists linked accounts',
    act: () => users.listAccounts('user /1'),
    url: '/api/users/user%20%2F1/accounts',
  },
  {
    name: 'lists user identities',
    act: () => users.listIdentities('user /1'),
    url: '/api/users/user%20%2F1/identities',
  },
  {
    name: 'bans a user without a reason',
    act: () => users.ban('user /1'),
    url: '/api/users/user%20%2F1/ban',
    init: { method: 'POST', body: '{"reason":null}' },
  },
  {
    name: 'bans a user with a reason',
    act: () => users.ban('user /1', { reason: 'Abuse report.' }),
    url: '/api/users/user%20%2F1/ban',
    init: { method: 'POST', body: '{"reason":"Abuse report."}' },
  },
  {
    name: 'unbans a user',
    act: () => users.unban('user /1'),
    url: '/api/users/user%20%2F1/unban',
    init: { method: 'POST' },
  },
  {
    name: 'checks username availability without an excluded user',
    act: () => users.checkUsernameAvailability('raheem / dev'),
    url: '/api/users/username-availability?username=raheem+%2F+dev',
  },
  {
    name: 'checks username availability while excluding a user',
    act: () => users.checkUsernameAvailability('raheem', 'user /1'),
    url: '/api/users/username-availability?username=raheem&exclude_user_id=user+%2F1',
  },
  {
    name: 'unlinks a user account',
    act: () => users.unlinkAccount('user /1', 'account /1'),
    url: '/api/users/user%20%2F1/accounts/account%20%2F1',
    init: { method: 'DELETE' },
  },
  {
    name: 'revokes user sessions',
    act: () => users.revokeSessions('user /1'),
    url: '/api/users/user%20%2F1/sessions',
    init: { method: 'DELETE' },
  },
]

describe('Console browser resource clients', () => {
  beforeEach(() => {
    requestMock.mockResolvedValue({ data: null, error: null })
    vi.clearAllMocks()
  })

  it.each(cases)('$name', async ({ act, url, init }) => {
    await act()

    expect(requestMock).toHaveBeenCalledTimes(1)
    if (init === undefined) expect(requestMock).toHaveBeenCalledWith(url)
    else expect(requestMock).toHaveBeenCalledWith(url, init)
  })

  it('keeps delete aliases bound to the canonical delete functions', () => {
    expect(apiKeys.apiKeys.delete).toBe(apiKeys.del)
    expect(apps.apps.delete).toBe(apps.remove)
    expect(features.features.delete).toBe(features.del)
    expect(orgs.orgs.delete).toBe(orgs.del)
    expect(reservedUsernames.reservedUsernames.delete).toBe(
      reservedUsernames.del
    )
    expect(roles.roles.delete).toBe(roles.del)
    expect(users.users.delete).toBe(users.del)
  })
})
