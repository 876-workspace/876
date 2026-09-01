import { COURIERS_MODULE_CATALOG } from '@876/couriers/settings-catalog'

export { COURIERS_MODULE_CATALOG }

type CourierModuleKey = (typeof COURIERS_MODULE_CATALOG)[number]['key']

export const COURIERS_MODULE_KEYS: readonly CourierModuleKey[] =
  COURIERS_MODULE_CATALOG.map((module) => module.key as CourierModuleKey)

const courierModuleKeys = new Set<string>(COURIERS_MODULE_KEYS)

export function isCourierModuleKey(value: string): value is CourierModuleKey {
  return courierModuleKeys.has(value)
}
