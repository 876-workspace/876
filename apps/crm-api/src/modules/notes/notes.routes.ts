import { Router } from 'express'

import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as controller from './notes.controller.js'

export function createNotesRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listNotes)
  router.post('/', requireInternalOrServiceApp, controller.createNote)
  router.patch('/:noteId', requireInternalOrServiceApp, controller.updateNote)
  router.delete('/:noteId', requireInternalOrServiceApp, controller.deleteNote)

  return router
}
