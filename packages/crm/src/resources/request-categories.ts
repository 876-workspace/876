import { z } from 'zod'

import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  deletedSchema,
  requestCategoryListSchema,
  requestCategorySchema,
  requestSubcategorySchema,
  type CreateRequestCategoryInput,
  type CreateRequestSubcategoryInput,
  type DeleteRequestCategoryInput,
  type RequestOptions,
  type UpdateRequestCategoryInput,
  type UpdateRequestSubcategoryInput,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/request-categories`
}

export function createRequestCategoriesResource(runtime: Runtime) {
  return {
    list(organizationId: string, options: RequestOptions = {}) {
      return request(
        runtime,
        { method: 'GET', path: root(organizationId), signal: options.signal },
        requestCategoryListSchema
      )
    },
    retrieve(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        requestCategorySchema
      )
    },
    create(
      organizationId: string,
      input: CreateRequestCategoryInput,
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
        requestCategorySchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateRequestCategoryInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        requestCategorySchema
      )
    },
    delete(
      organizationId: string,
      id: string,
      input: DeleteRequestCategoryInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        deletedSchema.extend({ object: z.literal('request_category') })
      )
    },
    subcategories: {
      create(
        organizationId: string,
        categoryId: string,
        input: CreateRequestSubcategoryInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'POST',
            path: `${root(organizationId)}/${encodeURIComponent(categoryId)}/subcategories`,
            body: input,
            signal: options.signal,
          },
          requestSubcategorySchema
        )
      },
      update(
        organizationId: string,
        categoryId: string,
        subcategoryId: string,
        input: UpdateRequestSubcategoryInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'PATCH',
            path: `${root(organizationId)}/${encodeURIComponent(categoryId)}/subcategories/${encodeURIComponent(subcategoryId)}`,
            body: input,
            signal: options.signal,
          },
          requestSubcategorySchema
        )
      },
      delete(
        organizationId: string,
        categoryId: string,
        subcategoryId: string,
        input: DeleteRequestCategoryInput,
        options: RequestOptions = {}
      ) {
        return request(
          runtime,
          {
            method: 'DELETE',
            path: `${root(organizationId)}/${encodeURIComponent(categoryId)}/subcategories/${encodeURIComponent(subcategoryId)}`,
            body: input,
            signal: options.signal,
          },
          deletedSchema.extend({ object: z.literal('request_subcategory') })
        )
      },
    },
  }
}
