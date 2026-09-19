import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import type {
  CreateCommentInput,
  CreateIssueInput,
  ListCommentsQuery,
  ListIssuesQuery,
  ListProjectsQuery,
  Result,
  UpdateCommentInput,
  UpdateIssueInput,
} from '@876/projects'

import type { createSessionClient } from './client'
import { scopeKeys } from './keys'

type SessionClient = ReturnType<typeof createSessionClient>

export interface SessionContext {
  organizationId: string
  userId: string
  client: SessionClient
}

export interface PageCursor {
  startingAfter?: string
}

function unwrap<T>(result: Result<T>): T {
  if (result.error || result.data === null)
    throw new Error(result.error?.message ?? 'Request failed.')
  return result.data
}

function nextCursor<T extends { id: string }>(page: {
  has_more: boolean
  data: T[]
}): PageCursor | undefined {
  if (!page.has_more || page.data.length === 0) return undefined
  const last = page.data[page.data.length - 1]
  if (!last) return undefined
  return { startingAfter: last.id }
}

export function flattenPages<T>(
  data: InfiniteData<{ has_more: boolean; data: T[] }> | undefined
): T[] {
  if (!data) return []
  return data.pages.flatMap((page) => page.data)
}

export function useProjects(
  session: SessionContext,
  query: ListProjectsQuery = {}
) {
  return useInfiniteQuery({
    queryKey: scopeKeys.projects(session.organizationId),
    queryFn: async ({ pageParam }) => {
      const result = await session.client.projects.list(
        session.organizationId,
        { ...query, ...(pageParam as ListProjectsQuery) }
      )
      return unwrap(result)
    },
    initialPageParam: {} as PageCursor,
    getNextPageParam: (lastPage) => nextCursor(lastPage),
  })
}

export function useProject(session: SessionContext, projectId: string) {
  return useQuery({
    queryKey: scopeKeys.project(session.organizationId, projectId),
    queryFn: async () => {
      const result = await session.client.projects.retrieve(
        session.organizationId,
        projectId
      )
      return unwrap(result)
    },
    enabled: projectId.length > 0,
  })
}

export function useIssues(
  session: SessionContext,
  query: ListIssuesQuery = {}
) {
  return useInfiniteQuery({
    queryKey: scopeKeys.issues(session.organizationId, query),
    queryFn: async ({ pageParam }) => {
      const result = await session.client.issues.list(session.organizationId, {
        ...query,
        ...(pageParam as ListIssuesQuery),
      })
      return unwrap(result)
    },
    initialPageParam: {} as PageCursor,
    getNextPageParam: (lastPage) => nextCursor(lastPage),
  })
}

export function useIssue(session: SessionContext, issueRef: string) {
  return useQuery({
    queryKey: scopeKeys.issue(session.organizationId, issueRef),
    queryFn: async () => {
      const result = await session.client.issues.retrieve(
        session.organizationId,
        issueRef
      )
      return unwrap(result)
    },
    enabled: issueRef.length > 0,
  })
}

export function useCreateIssue(session: SessionContext) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateIssueInput) =>
      unwrap(
        await session.client.issues.create(session.organizationId, input)
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: scopeKeys.all(session.organizationId),
      })
    },
  })
}

export function useUpdateIssue(session: SessionContext, issueRef: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateIssueInput) =>
      unwrap(
        await session.client.issues.update(
          session.organizationId,
          issueRef,
          input
        )
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: scopeKeys.issue(session.organizationId, issueRef),
      })
      void queryClient.invalidateQueries({
        queryKey: scopeKeys.issues(session.organizationId),
      })
    },
  })
}

export function useComments(
  session: SessionContext,
  issueRef: string,
  query: ListCommentsQuery = {}
) {
  return useInfiniteQuery({
    queryKey: scopeKeys.comments(session.organizationId, issueRef),
    queryFn: async ({ pageParam }) => {
      const result = await session.client.comments.list(
        session.organizationId,
        issueRef,
        { ...query, ...(pageParam as ListCommentsQuery) }
      )
      return unwrap(result)
    },
    initialPageParam: {} as PageCursor,
    getNextPageParam: (lastPage) => nextCursor(lastPage),
    enabled: issueRef.length > 0,
  })
}

export function useCreateComment(session: SessionContext, issueRef: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCommentInput) =>
      unwrap(
        await session.client.comments.create(
          session.organizationId,
          issueRef,
          input
        )
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: scopeKeys.comments(session.organizationId, issueRef),
      })
    },
  })
}

export function useUpdateComment(session: SessionContext, issueRef: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      commentId,
      input,
    }: {
      commentId: string
      input: UpdateCommentInput
    }) =>
      unwrap(
        await session.client.comments.update(
          session.organizationId,
          issueRef,
          commentId,
          input
        )
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: scopeKeys.comments(session.organizationId, issueRef),
      })
    },
  })
}

export function useDeleteComment(session: SessionContext, issueRef: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) =>
      unwrap(
        await session.client.comments.delete(
          session.organizationId,
          issueRef,
          commentId
        )
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: scopeKeys.comments(session.organizationId, issueRef),
      })
    },
  })
}

export function useNotifications(session: SessionContext) {
  return useQuery({
    queryKey: scopeKeys.notifications(
      session.organizationId,
      session.userId
    ),
    queryFn: async () => {
      const result = await session.client.notifications.list(
        session.organizationId,
        session.userId
      )
      return unwrap(result)
    },
  })
}

export function useMyWork(session: SessionContext) {
  return useQuery({
    queryKey: scopeKeys.myWork(session.organizationId, session.userId),
    queryFn: async () => {
      const result = await session.client.myWork.retrieve(
        session.organizationId,
        session.userId
      )
      return unwrap(result)
    },
  })
}
