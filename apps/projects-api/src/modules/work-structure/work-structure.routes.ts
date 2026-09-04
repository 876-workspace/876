import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
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
  router.post('/milestones', requireInternalKey, controller.createMilestone)
  router.get(
    '/milestones/:id',
    requireInternalKey,
    controller.retrieveMilestone
  )
  router.patch(
    '/milestones/:id',
    requireInternalKey,
    controller.updateMilestone
  )
  router.delete(
    '/milestones/:id',
    requireInternalKey,
    controller.removeMilestone
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
  return router
}

export function createCustomFieldValuesRouter(): Router {
  const router = Router({ mergeParams: true })
  router.get('/', requireInternalKey, controller.listCustomFieldValues)
  router.put('/', requireInternalKey, controller.setCustomFieldValue)
  router.delete('/:id', requireInternalKey, controller.clearCustomFieldValue)
  return router
}
