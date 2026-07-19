import {
  kbFns,
  runKbMutation,
  runKbQuery,
  serviceAuth,
  type KbHost,
} from '@/lib/kb/convex-client'
import type {
  DeletedKbCategory,
  KbCategoryList,
  KbCategoryResource,
} from './types'

export async function listCategoriesForHost(params: {
  actorUserId: string
  host: KbHost
}) {
  const auth = serviceAuth(params.actorUserId)
  return runKbQuery<KbCategoryList>(
    'categories.listForHost',
    async (client) => {
      const data = await client.query(kbFns.categories.listForHost, {
        ...auth,
        host: params.host,
        maxAudience: 'org_member',
      })
      return {
        object: 'list',
        data: data ?? [],
        has_more: false,
        url: '/v1/kb/categories',
        total_count: (data ?? []).length,
      }
    }
  )
}

export async function listAllCategories(params: {
  actorUserId: string
  host?: KbHost
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbQuery<KbCategoryList>('categories.listAll', async (client) => {
    const data = await client.query(kbFns.categories.listAll, {
      ...auth,
      isAdmin: true,
      host: params.host,
    })
    return {
      object: 'list',
      data: data ?? [],
      has_more: false,
      url: '/v1/admin/kb/categories',
      total_count: (data ?? []).length,
    }
  })
}

export async function createCategory(params: {
  actorUserId: string
  slug: string
  name: string
  description?: string
  parentId?: string
  sortOrder?: number
  hosts: KbHost[]
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbMutation<KbCategoryResource>(
    'categories.create',
    async (client) =>
      client.mutation(kbFns.categories.create, {
        ...auth,
        isAdmin: true,
        slug: params.slug,
        name: params.name,
        description: params.description,
        parentId: params.parentId,
        sortOrder: params.sortOrder,
        hosts: params.hosts,
      })
  )
}

export async function updateCategory(params: {
  actorUserId: string
  id: string
  slug?: string
  name?: string
  description?: string | null
  parentId?: string | null
  sortOrder?: number
  hosts?: KbHost[]
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbMutation<KbCategoryResource>(
    'categories.update',
    async (client) =>
      client.mutation(kbFns.categories.update, {
        ...auth,
        isAdmin: true,
        id: params.id,
        slug: params.slug,
        name: params.name,
        description: params.description,
        parentId: params.parentId,
        sortOrder: params.sortOrder,
        hosts: params.hosts,
      })
  )
}

export async function deleteCategory(params: {
  actorUserId: string
  id: string
}) {
  const auth = serviceAuth(params.actorUserId, true)
  return runKbMutation<DeletedKbCategory>('categories.remove', async (client) =>
    client.mutation(kbFns.categories.remove, {
      ...auth,
      isAdmin: true,
      id: params.id,
    })
  )
}
