import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import { createCommentsRouter } from '../comments/comments.routes.js'
import { createCustomFieldValuesRouter } from '../work-structure/work-structure.routes.js'
import * as issueLinksController from './issue-links.controller.js'
import * as controller from './issues.controller.js'

export function createIssuesRouter(): Router {
  const router = Router({ mergeParams: true })

  router.use('/:issueRef/comments', createCommentsRouter())
  router.use('/:issueRef/custom-field-values', createCustomFieldValuesRouter())

  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.get('/:issueRef', requireInternalKey, controller.retrieve)
  router.patch('/:issueRef', requireInternalKey, controller.update)
  router.delete('/:issueRef', requireInternalKey, controller.remove)
  router.patch(
    '/:issueRef/client-visibility',
    requireInternalKey,
    controller.setVisibility
  )
  router.get('/:issueRef/events', requireInternalKey, controller.listEvents)
  router.get(
    '/:issueRef/relations',
    requireInternalKey,
    issueLinksController.listRelations
  )
  router.post(
    '/:issueRef/relations',
    requireInternalKey,
    issueLinksController.createRelation
  )
  router.delete(
    '/:issueRef/relations/:id',
    requireInternalKey,
    issueLinksController.removeRelation
  )
  router.get(
    '/:issueRef/dependencies',
    requireInternalKey,
    issueLinksController.listDependencies
  )
  router.post(
    '/:issueRef/dependencies',
    requireInternalKey,
    issueLinksController.createDependency
  )
  router.post(
    '/:issueRef/dependencies/schedule-suggestion',
    requireInternalKey,
    issueLinksController.suggestSchedule
  )
  router.patch(
    '/:issueRef/dependencies/:id',
    requireInternalKey,
    issueLinksController.updateDependency
  )
  router.delete(
    '/:issueRef/dependencies/:id',
    requireInternalKey,
    issueLinksController.removeDependency
  )

  return router
}
