'use client'

import type {
  CrmRequestCategory,
  CrmRequestCategoryCreateInput,
  CrmRequestCategoryList,
  CrmRequestCategoryUpdateInput,
  CrmRequestSubcategory,
  CrmRequestSubcategoryCreateInput,
  CrmRequestSubcategoryUpdateInput,
} from '@876/client'

import { request } from './request'

export type RequestCategoryCreateInput = Omit<
  CrmRequestCategoryCreateInput,
  'createdBy'
>
export type RequestSubcategoryCreateInput = Omit<
  CrmRequestSubcategoryCreateInput,
  'createdBy'
>

function categoryPath(categoryId: string): string {
  return `/api/request-categories/${encodeURIComponent(categoryId)}`
}

export const requestCategories = {
  list() {
    return request<CrmRequestCategoryList>('/api/request-categories')
  },
  create(params: RequestCategoryCreateInput) {
    return request<CrmRequestCategory>('/api/request-categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(categoryId: string, params: CrmRequestCategoryUpdateInput) {
    return request<CrmRequestCategory>(categoryPath(categoryId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(categoryId: string, reason?: string) {
    return request<{
      object: 'request_category'
      id: string
      deleted: true
    }>(categoryPath(categoryId), {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
  },
  subcategories: {
    create(categoryId: string, params: RequestSubcategoryCreateInput) {
      return request<CrmRequestSubcategory>(
        `${categoryPath(categoryId)}/subcategories`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        }
      )
    },
    update(
      categoryId: string,
      subcategoryId: string,
      params: CrmRequestSubcategoryUpdateInput
    ) {
      return request<CrmRequestSubcategory>(
        `${categoryPath(categoryId)}/subcategories/${encodeURIComponent(subcategoryId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        }
      )
    },
    delete(categoryId: string, subcategoryId: string, reason?: string) {
      return request<{
        object: 'request_subcategory'
        id: string
        deleted: true
      }>(
        `${categoryPath(categoryId)}/subcategories/${encodeURIComponent(subcategoryId)}`,
        {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      )
    },
  },
}
