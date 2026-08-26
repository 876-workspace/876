export type AppId =
  | '876'
  | 'console'
  | 'enterprise'
  | 'billing'
  | 'couriers'
  | 'crm'
  | 'widgets'
  | 'storage'

export interface AppContext {
  app: AppId
  requestId?: string
}
