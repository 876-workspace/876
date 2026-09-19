import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  captureListSchema,
  captureSchema,
  deletedSchema,
  issueSchema,
  type CreateCaptureInput,
  type PromoteCaptureInput,
  type RequestOptions,
  type UpdateCaptureInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/captures`
}

export function createCapturesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      input: { status?: 'inbox' | 'promoted' | 'discarded' } = {},
      options: RequestOptions = {}
    ) {
      const query = input.status
        ? `?status=${encodeURIComponent(input.status)}`
        : ''
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${query}`,
          signal: options.signal,
        },
        captureListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateCaptureInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: input,
          signal: options.signal,
        },
        captureSchema
      )
    },
    update(
      organizationId: string,
      captureId: string,
      input: UpdateCaptureInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(captureId)}`,
          body: input,
          signal: options.signal,
        },
        captureSchema
      )
    },
    promote(
      organizationId: string,
      captureId: string,
      input: PromoteCaptureInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(captureId)}/promote`,
          body: input,
          signal: options.signal,
        },
        issueSchema
      )
    },
    discard(
      organizationId: string,
      captureId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(captureId)}/discard`,
          signal: options.signal,
        },
        captureSchema
      )
    },
    delete(
      organizationId: string,
      captureId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(captureId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
  }
}
