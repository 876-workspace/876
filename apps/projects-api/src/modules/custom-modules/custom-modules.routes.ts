import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './custom-modules.controller.js'

export function createCustomModulesRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/custom-modules', requireInternalKey, controller.listModules)
  router.post('/custom-modules', requireInternalKey, controller.createModule)
  router.get('/custom-modules/by-key/:moduleKey', requireInternalKey, controller.retrieveModuleByKey)
  router.get('/custom-modules/:moduleId', requireInternalKey, controller.retrieveModule)
  router.patch('/custom-modules/:moduleId', requireInternalKey, controller.updateModule)
  router.delete('/custom-modules/:moduleId', requireInternalKey, controller.removeModule)

  router.get('/custom-modules/:moduleId/fields', requireInternalKey, controller.listFields)
  router.post('/custom-modules/:moduleId/fields', requireInternalKey, controller.createField)
  router.patch('/custom-modules/:moduleId/fields/:fieldId', requireInternalKey, controller.updateField)
  router.delete('/custom-modules/:moduleId/fields/:fieldId', requireInternalKey, controller.removeField)

  router.get('/custom-modules/:moduleId/statuses', requireInternalKey, controller.listStatuses)
  router.post('/custom-modules/:moduleId/statuses', requireInternalKey, controller.createStatus)
  router.patch('/custom-modules/:moduleId/statuses/reorder', requireInternalKey, controller.reorderStatuses)
  router.patch('/custom-modules/:moduleId/statuses/:statusId', requireInternalKey, controller.updateStatus)
  router.delete('/custom-modules/:moduleId/statuses/:statusId', requireInternalKey, controller.removeStatus)

  router.get('/custom-modules/:moduleId/records', requireInternalKey, controller.listRecords)
  router.post('/custom-modules/:moduleId/records', requireInternalKey, controller.createRecord)
  router.get('/custom-modules/:moduleId/records/:recordId', requireInternalKey, controller.retrieveRecord)
  router.patch('/custom-modules/:moduleId/records/:recordId', requireInternalKey, controller.updateRecord)
  router.delete('/custom-modules/:moduleId/records/:recordId', requireInternalKey, controller.removeRecord)

  router.get('/custom-modules/:moduleId/records/:recordId/links', requireInternalKey, controller.listLinks)
  router.post('/custom-modules/:moduleId/records/:recordId/links', requireInternalKey, controller.createLink)
  router.delete(
    '/custom-modules/:moduleId/records/:recordId/links/:linkId',
    requireInternalKey,
    controller.removeLink
  )

  router.get('/custom-modules/:moduleId/reports/by-status', requireInternalKey, controller.getStatusReport)
  router.get('/custom-modules/:moduleId/reports/by-field', requireInternalKey, controller.getFieldReport)
  router.get('/custom-modules/:moduleId/reports/created', requireInternalKey, controller.getCreatedReport)

  router.get('/dashboard-widgets', requireInternalKey, controller.listWidgets)
  router.post('/dashboard-widgets', requireInternalKey, controller.createWidget)
  router.patch('/dashboard-widgets/:widgetId', requireInternalKey, controller.updateWidget)
  router.delete('/dashboard-widgets/:widgetId', requireInternalKey, controller.removeWidget)

  return router
}
