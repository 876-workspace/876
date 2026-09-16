import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import { portalContext, portalScope } from './portal-auth.js'
import {
  portalActivityQuerySchema,
  portalCreateCommentBodySchema,
  portalCreateDiscussionPostBodySchema,
  portalDiscussionParamsSchema,
  portalIssueParamsSchema,
  portalListQuerySchema,
  portalMilestoneParamsSchema,
  portalPageParamsSchema,
  portalParamsSchema,
} from './portal.schemas.js'
import * as service from './portal.service.js'

export async function listIssues(req: Request, res: Response) {
  const scope = portalScope(portalContext(res))
  const query = portalListQuerySchema.parse(req.query)
  const result = await service.listIssues(scope, query)
  return sendProjectsList(
    res,
    result,
    `/portal/organizations/${scope.organizationId}/projects/${scope.projectId}/issues`
  )
}

export async function retrieveIssue(req: Request, res: Response) {
  const params = portalIssueParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveIssue(portalScope(portalContext(res)), params.issueRef)
  )
}

export async function listIssueComments(req: Request, res: Response) {
  const params = portalIssueParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.listIssueComments(portalScope(portalContext(res)), params.issueRef)
  )
}

export async function listMilestones(req: Request, res: Response) {
  const scope = portalScope(portalContext(res))
  const query = portalListQuerySchema.parse(req.query)
  const result = await service.listMilestones(scope, query)
  return sendProjectsList(
    res,
    result,
    `/portal/organizations/${scope.organizationId}/projects/${scope.projectId}/milestones`
  )
}

export async function retrieveMilestone(req: Request, res: Response) {
  const params = portalMilestoneParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveMilestone(portalScope(portalContext(res)), params.milestoneId)
  )
}

export async function listMilestoneComments(req: Request, res: Response) {
  const params = portalMilestoneParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.listMilestoneComments(portalScope(portalContext(res)), params.milestoneId)
  )
}

export async function listDiscussions(req: Request, res: Response) {
  const scope = portalScope(portalContext(res))
  void portalParamsSchema.parse(req.params)
  const query = portalListQuerySchema.parse(req.query)
  const result = await service.listDiscussions(scope, query)
  return sendProjectsList(
    res,
    result,
    `/portal/organizations/${scope.organizationId}/projects/${scope.projectId}/discussions`
  )
}

export async function retrieveDiscussion(req: Request, res: Response) {
  const params = portalDiscussionParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveDiscussion(portalScope(portalContext(res)), params.discussionId)
  )
}

export async function listWikiPages(req: Request, res: Response) {
  const scope = portalScope(portalContext(res))
  void portalParamsSchema.parse(req.params)
  const query = portalListQuerySchema.parse(req.query)
  const result = await service.listWikiPages(scope, query)
  return sendProjectsList(
    res,
    result,
    `/portal/organizations/${scope.organizationId}/projects/${scope.projectId}/wiki`
  )
}

export async function retrieveWikiPage(req: Request, res: Response) {
  const params = portalPageParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveWikiPage(portalScope(portalContext(res)), params.pageRef)
  )
}

export async function listAttachments(req: Request, res: Response) {
  const scope = portalScope(portalContext(res))
  void portalParamsSchema.parse(req.params)
  const query = portalListQuerySchema.parse(req.query)
  const result = await service.listAttachments(scope, query)
  return sendProjectsList(
    res,
    result,
    `/portal/organizations/${scope.organizationId}/projects/${scope.projectId}/attachments`
  )
}

export async function listActivity(req: Request, res: Response) {
  const scope = portalScope(portalContext(res))
  void portalParamsSchema.parse(req.params)
  const query = portalActivityQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.listActivity(scope, query)
  )
}

export async function getTimeByPhase(req: Request, res: Response) {
  void portalParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.getTimeByPhase(portalScope(portalContext(res)))
  )
}

export async function listInvoices(req: Request, res: Response) {
  void portalParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.listInvoices(portalScope(portalContext(res)))
  )
}

export async function createIssueComment(req: Request, res: Response) {
  const params = portalIssueParamsSchema.parse(req.params)
  const body = portalCreateCommentBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createIssueComment(
      portalScope(portalContext(res)),
      params.issueRef,
      body
    ),
    201
  )
}

export async function createMilestoneComment(req: Request, res: Response) {
  const params = portalMilestoneParamsSchema.parse(req.params)
  const body = portalCreateCommentBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createMilestoneComment(
      portalScope(portalContext(res)),
      params.milestoneId,
      body
    ),
    201
  )
}

export async function createDiscussionPost(req: Request, res: Response) {
  const params = portalDiscussionParamsSchema.parse(req.params)
  const body = portalCreateDiscussionPostBodySchema.parse(req.body)
  return sendProjectsResult(
    res,
    await service.createDiscussionPost(
      portalScope(portalContext(res)),
      params.discussionId,
      body
    ),
    201
  )
}
