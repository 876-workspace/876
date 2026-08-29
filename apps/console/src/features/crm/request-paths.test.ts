import { describe, expect, it } from 'vitest'

import { PLATFORM_REQUESTS_HREF, requestCollectionHref } from './request-paths'

describe('request paths', () => {
  it('uses /requests for the platform operator surface', () => {
    expect(PLATFORM_REQUESTS_HREF).toBe('/requests')
    expect(requestCollectionHref('/requests/crm_req_1', 'crm_req_1')).toBe(
      '/requests'
    )
  })

  it('preserves an organization CRM collection when shared record actions run', () => {
    expect(
      requestCollectionHref(
        '/orgs/acme/workspace/crm/requests/crm_req_1',
        'crm_req_1'
      )
    ).toBe('/orgs/acme/workspace/crm/requests')
  })
})
