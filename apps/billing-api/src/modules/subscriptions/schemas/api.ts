export type ServiceOk<T> = {
  data: T
  error: null
  warning?: string
}

export type ServiceErr = {
  data: null
  error: string
  status?: number
  code?: string
}

export type ServiceResult<T> = Promise<ServiceOk<T> | ServiceErr>
