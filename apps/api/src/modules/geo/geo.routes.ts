import { z } from 'zod'

import { createApiRouter } from '@/http/api-router'

import * as controller from './geo.controller'
import * as docs from './geo.docs'
import {
  countrySchema,
  currencySchema,
  listRegionsParamsSchema,
  regionSchema,
} from './geo.schemas'

/**
 * Geographic reference data is public — country, region, and currency lists are
 * needed to render a sign-up form, before any credential exists to present.
 */
const api = createApiRouter({ tag: 'Geo', prefix: '/geo', security: 'public' })

api.get({
  path: '/currencies',
  operationId: 'geo-list_currencies',
  summary: docs.LIST_CURRENCIES_SUMMARY,
  description: docs.LIST_CURRENCIES_DESCRIPTION,
  responses: {
    200: {
      ...docs.LIST_CURRENCIES_RESPONSES[200],
      schema: z.array(currencySchema),
    },
  },
  handler: controller.listCurrencies,
})

api.get({
  path: '/countries',
  operationId: 'geo-list_countries',
  summary: docs.LIST_COUNTRIES_SUMMARY,
  description: docs.LIST_COUNTRIES_DESCRIPTION,
  responses: {
    200: {
      ...docs.LIST_COUNTRIES_RESPONSES[200],
      schema: z.array(countrySchema),
    },
  },
  handler: controller.listCountries,
})

api.get({
  path: '/countries/:country_code/regions',
  operationId: 'geo-list_regions',
  summary: docs.LIST_REGIONS_SUMMARY,
  description: docs.LIST_REGIONS_DESCRIPTION,
  request: { params: listRegionsParamsSchema },
  responses: {
    200: {
      ...docs.LIST_REGIONS_RESPONSES[200],
      schema: z.array(regionSchema),
    },
    404: docs.LIST_REGIONS_RESPONSES[404],
  },
  handler: controller.listRegions,
})

export const geoRouter = api.router
