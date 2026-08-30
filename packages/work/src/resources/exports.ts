import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workCalendarExportSchema,
  type CreateWorkCalendarExportInput,
} from '../types'

export function createExportsResource(runtime: WorkRuntime) {
  return {
    create(organizationId: string, input: CreateWorkCalendarExportInput) {
      return workRequest(
        runtime,
        {
          method: 'POST',
          path: `/v1/organizations/${encodeURIComponent(organizationId)}/exports`,
          body: input,
        },
        workCalendarExportSchema
      )
    },
  }
}
