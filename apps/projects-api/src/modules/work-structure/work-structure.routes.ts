import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as cycles from './cycles.controller.js'
import * as milestoneDetails from './milestone-details.controller.js'
import { listOrganizationMilestonesController } from './milestone-list.controller.js'
import * as taskLists from './task-lists.controller.js'
import * as controller from './work-structure.controller.js'

export function createWorkStructureRouter(): Router {
  const router = Router({ mergeParams: true })
  router.get(
    '/work-item-types',
    requireInternalKey,
    controller.listWorkItemTypes
  )
  router.post(
    '/work-item-types',
    requireInternalKey,
    controller.createWorkItemType
  )
  router.get(
    '/work-item-types/:id',
    requireInternalKey,
    controller.retrieveWorkItemType
  )
  router.patch(
    '/work-item-types/:id',
    requireInternalKey,
    controller.updateWorkItemType
  )
  router.delete(
    '/work-item-types/:id',
    requireInternalKey,
    controller.removeWorkItemType
  )
  router.get(
    '/workflow-states',
    requireInternalKey,
    controller.listWorkflowStates
  )
  router.post(
    '/workflow-states',
    requireInternalKey,
    controller.createWorkflowState
  )
  router.get(
    '/workflow-states/:id',
    requireInternalKey,
    controller.retrieveWorkflowState
  )
  router.patch(
    '/workflow-states/:id',
    requireInternalKey,
    controller.updateWorkflowState
  )
  router.delete(
    '/workflow-states/:id',
    requireInternalKey,
    controller.removeWorkflowState
  )

  router.get('/milestones', requireInternalKey, controller.listMilestones)
  router.get(
    '/milestones/all',
    requireInternalKey,
    listOrganizationMilestonesController
  )
  router.post(
    '/milestones',
    requireInternalKey,
    milestoneDetails.createMilestone
  )
  router.get(
    '/milestones/:id',
    requireInternalKey,
    controller.retrieveMilestone
  )
  router.patch(
    '/milestones/:id',
    requireInternalKey,
    milestoneDetails.updateMilestone
  )
  router.delete(
    '/milestones/:id',
    requireInternalKey,
    controller.removeMilestone
  )
  router.patch(
    '/milestones/:id/client-visibility',
    requireInternalKey,
    controller.setMilestoneVisibility
  )
  router.get(
    '/milestones/:id/summary',
    requireInternalKey,
    milestoneDetails.retrieveSummary
  )
  router.get(
    '/milestones/:id/comments',
    requireInternalKey,
    milestoneDetails.listComments
  )
  router.post(
    '/milestones/:id/comments',
    requireInternalKey,
    milestoneDetails.createComment
  )
  router.patch(
    '/milestones/:id/comments/:commentId',
    requireInternalKey,
    milestoneDetails.updateComment
  )
  router.delete(
    '/milestones/:id/comments/:commentId',
    requireInternalKey,
    milestoneDetails.removeComment
  )
  router.patch(
    '/milestones/:id/comments/:commentId/client-visibility',
    requireInternalKey,
    milestoneDetails.setCommentVisibility
  )
  router.get(
    '/milestones/:id/events',
    requireInternalKey,
    milestoneDetails.listEvents
  )
  router.get(
    '/milestones/:id/custom-field-values',
    requireInternalKey,
    milestoneDetails.listCustomFieldValues
  )
  router.put(
    '/milestones/:id/custom-field-values',
    requireInternalKey,
    milestoneDetails.setCustomFieldValues
  )
  router.post(
    '/milestones/:id/clone',
    requireInternalKey,
    milestoneDetails.cloneMilestone
  )

  router.get(
    '/milestone-custom-fields',
    requireInternalKey,
    milestoneDetails.listCustomFields
  )
  router.post(
    '/milestone-custom-fields',
    requireInternalKey,
    milestoneDetails.createCustomField
  )
  router.patch(
    '/milestone-custom-fields/:fieldId',
    requireInternalKey,
    milestoneDetails.updateCustomField
  )
  router.delete(
    '/milestone-custom-fields/:fieldId',
    requireInternalKey,
    milestoneDetails.removeCustomField
  )

  router.get('/custom-fields', requireInternalKey, controller.listCustomFields)
  router.post(
    '/custom-fields',
    requireInternalKey,
    controller.createCustomField
  )
  router.get(
    '/custom-fields/:id',
    requireInternalKey,
    controller.retrieveCustomField
  )
  router.patch(
    '/custom-fields/:id',
    requireInternalKey,
    controller.updateCustomField
  )
  router.delete(
    '/custom-fields/:id',
    requireInternalKey,
    controller.removeCustomField
  )
  router.get('/presets', requireInternalKey, controller.listPresets)
  router.post('/presets/apply', requireInternalKey, controller.applyPreset)

  router.get(
    '/projects/:projectId/task-lists',
    requireInternalKey,
    taskLists.listTaskLists
  )
  router.post(
    '/projects/:projectId/task-lists',
    requireInternalKey,
    taskLists.createTaskList
  )
  router.put(
    '/projects/:projectId/task-lists/order',
    requireInternalKey,
    taskLists.reorderTaskLists
  )
  router.get(
    '/projects/:projectId/work-breakdown',
    requireInternalKey,
    taskLists.workBreakdown
  )
  router.get('/task-lists/:id', requireInternalKey, taskLists.retrieveTaskList)
  router.patch('/task-lists/:id', requireInternalKey, taskLists.updateTaskList)
  router.delete('/task-lists/:id', requireInternalKey, taskLists.removeTaskList)
  router.post(
    '/task-lists/:id/archive',
    requireInternalKey,
    taskLists.archiveTaskList
  )
  router.post(
    '/task-lists/:id/restore',
    requireInternalKey,
    taskLists.restoreTaskList
  )
  router.post(
    '/task-lists/:id/issues',
    requireInternalKey,
    taskLists.moveIssues
  )

  router.get('/cycles', requireInternalKey, cycles.listCycles)
  router.post('/cycles', requireInternalKey, cycles.createCycle)
  router.get('/cycles/:id', requireInternalKey, cycles.retrieveCycle)
  router.patch('/cycles/:id', requireInternalKey, cycles.updateCycle)
  router.delete('/cycles/:id', requireInternalKey, cycles.removeCycle)
  router.post('/cycles/:id/issues', requireInternalKey, cycles.assignIssues)
  router.delete(
    '/cycles/:id/issues/:issueId',
    requireInternalKey,
    cycles.unassignIssue
  )
  return router
}

export function createCustomFieldValuesRouter(): Router {
  const router = Router({ mergeParams: true })
  router.get('/', requireInternalKey, controller.listCustomFieldValues)
  router.put('/', requireInternalKey, controller.setCustomFieldValue)
  router.delete('/:id', requireInternalKey, controller.clearCustomFieldValue)
  return router
}
