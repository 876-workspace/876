import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './discussions.controller.js'

export function createDiscussionsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.listDiscussions)
  router.post('/', requireInternalKey, controller.createDiscussion)
  router.get('/:discussionId', requireInternalKey, controller.retrieveDiscussion)
  router.patch(
    '/:discussionId',
    requireInternalKey,
    controller.updateDiscussion
  )
  router.delete(
    '/:discussionId',
    requireInternalKey,
    controller.removeDiscussion
  )
  router.patch(
    '/:discussionId/client-visibility',
    requireInternalKey,
    controller.setVisibility
  )
  router.get(
    '/:discussionId/posts',
    requireInternalKey,
    controller.listPosts
  )
  router.post(
    '/:discussionId/posts',
    requireInternalKey,
    controller.createPost
  )
  router.patch(
    '/:discussionId/posts/:postId',
    requireInternalKey,
    controller.updatePost
  )
  router.delete(
    '/:discussionId/posts/:postId',
    requireInternalKey,
    controller.removePost
  )

  return router
}
