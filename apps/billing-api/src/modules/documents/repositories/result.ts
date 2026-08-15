import type { ServiceErr, ServiceOk } from '../schemas/api'

export function ok<T>(data: T, warning?: string): ServiceOk<T> {
  return warning ? { data, error: null, warning } : { data, error: null }
}

export function err(error: string, status?: number): ServiceErr {
  return { data: null, error, status }
}
