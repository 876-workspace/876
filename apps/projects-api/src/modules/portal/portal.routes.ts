import { Router } from 'express'

import { requirePortalGrant } from './portal-auth.js'
import * as controller from './portal.controller.js'

export function createPortalRouter(): Router {
  const router = Router({ mergeParams: true })

  router.use(requirePortalGrant)

  router.get('/issues', controller.listIssues)
  router.get('/issues/:issueRef', controller.retrieveIssue)
  router.get('/issues/:issueRef/comments', controller.listIssueComments)
  router.post('/issues/:issueRef/comments', controller.createIssueComment)
  router.get('/milestones', controller.listMilestones)
  router.get('/milestones/:milestoneId', controller.retrieveMilestone)
  router.get(
    '/milestones/:milestoneId/comments',
    controller.listMilestoneComments
  )
  router.post(
    '/milestones/:milestoneId/comments',
    controller.createMilestoneComment
  )
  router.get('/discussions', controller.listDiscussions)
  router.get('/discussions/:discussionId', controller.retrieveDiscussion)
  router.post(
    '/discussions/:discussionId/posts',
    controller.createDiscussionPost
  )
  router.get('/wiki', controller.listWikiPages)
  router.get('/wiki/:pageRef', controller.retrieveWikiPage)
  router.get('/attachments', controller.listAttachments)
  router.get('/activity', controller.listActivity)
  router.get('/time-by-phase', controller.getTimeByPhase)
  router.get('/invoices', controller.listInvoices)

  return router
}
