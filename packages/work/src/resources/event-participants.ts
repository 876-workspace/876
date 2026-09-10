import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import type { WorkEventParticipantResponseInput } from '../response-contracts'
import {
  workEventParticipantListSchema,
  workEventParticipantSchema,
  type CreateWorkEventParticipantInput,
  type UpdateWorkEventParticipantInput,
} from '../types'

function root(organizationId: string, eventId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/events/${encodeURIComponent(eventId)}/participants`
}

export function createEventParticipantsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, eventId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: root(organizationId, eventId) },
        workEventParticipantListSchema
      )
    },
    create(
      organizationId: string,
      eventId: string,
      input: CreateWorkEventParticipantInput
    ) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId, eventId), body: input },
        workEventParticipantSchema
      )
    },
    update(
      organizationId: string,
      eventId: string,
      participantId: string,
      input: UpdateWorkEventParticipantInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, eventId)}/${encodeURIComponent(participantId)}`,
          body: input,
        },
        workEventParticipantSchema
      )
    },
    respond(
      organizationId: string,
      eventId: string,
      participantId: string,
      input: WorkEventParticipantResponseInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, eventId)}/${encodeURIComponent(participantId)}/response`,
          body: input,
        },
        workEventParticipantSchema
      )
    },
    delete(organizationId: string, eventId: string, participantId: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, eventId)}/${encodeURIComponent(participantId)}`,
        },
        z.object({
          object: z.literal('event_participant'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
