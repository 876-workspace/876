import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type { AdminGeoCurrency, AdminGeoLanguage } from '../types'

/** `$876.geo.*` — read-only platform reference catalogs. */
export function createAdminGeoResource(runtime: AdminRuntime) {
  return {
    listCurrencies() {
      return adminRequest<AdminGeoCurrency[]>(runtime, {
        method: 'GET',
        path: '/geo/currencies',
      })
    },

    listLanguages() {
      return adminRequest<AdminGeoLanguage[]>(runtime, {
        method: 'GET',
        path: '/geo/languages',
      })
    },
  }
}
