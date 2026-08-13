export type AppId =
  | '876'
  | 'console'
  | 'enterprise'
  | 'billing'
  | 'couriers'
  | 'widgets'
  | 'storage'

export interface AppContext {
  app: AppId
  requestId?: string
}
