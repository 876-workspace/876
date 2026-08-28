import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './notes.controller.js'

export function createNotesRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listNotes)
  router.post('/', requireInternal, controller.createNote)
  router.patch('/:noteId', requireInternal, controller.updateNote)
  router.delete('/:noteId', requireInternal, controller.deleteNote)

  return router
}
