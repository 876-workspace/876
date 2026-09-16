import type { MyWork } from '@876/projects/contracts'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  MyWorkEvents,
  MyWorkIssues,
  MyWorkReminders,
  type MyWorkResult,
} from './my-work-sections'

const SEPTEMBER_20_2026 = Date.UTC(2026, 8, 20) / 1000

function myWork(overrides: Partial<MyWork> = {}): MyWork {
  return {
    object: 'my-work',
    userId: 'usr_1',
    assignedIssues: [],
    upcomingEvents: [],
    dueReminders: [],
    ...overrides,
  }
}

function loaded(data: MyWork): Promise<MyWorkResult> {
  return Promise.resolve({ data, error: null })
}

describe('MyWorkIssues', () => {
  it('states that nothing is assigned', async () => {
    render(await MyWorkIssues({ myWork: loaded(myWork()) }))

    expect(screen.getByText('No assigned work items')).toBeInTheDocument()
  })

  it('links each assigned work item to its record', async () => {
    render(
      await MyWorkIssues({
        myWork: loaded(
          myWork({
            assignedIssues: [
              {
                object: 'projects.my-work-issue',
                id: 'iss_1',
                projectId: 'prj_1',
                identifier: 'APL-12',
                title: 'Ship the calendar',
                status: 'in-progress',
                dueDate: SEPTEMBER_20_2026,
                plannedStartDate: null,
                plannedFinishDate: null,
              },
            ],
          })
        ),
      })
    )

    expect(screen.getByRole('link', { name: 'APL-12' })).toHaveAttribute(
      'href',
      '/issues/APL-12'
    )
    expect(screen.getByText('Ship the calendar')).toBeInTheDocument()
    expect(screen.getByText('Due Sep 20, 2026')).toBeInTheDocument()
  })

  it('reports a section that could not be loaded', async () => {
    render(
      await MyWorkIssues({
        myWork: Promise.resolve({
          data: null,
          error: { code: 'projects/unavailable', message: 'Down.' },
        }),
      })
    )

    expect(
      screen.getByText('This section could not be loaded')
    ).toBeInTheDocument()
  })
})

describe('MyWorkEvents', () => {
  it('states that nothing is upcoming', async () => {
    render(await MyWorkEvents({ myWork: loaded(myWork()) }))

    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
  })

  it('links each upcoming event to its event page', async () => {
    render(
      await MyWorkEvents({
        myWork: loaded(
          myWork({
            upcomingEvents: [
              {
                object: 'projects.event',
                id: 'evt_1',
                tenantId: 'tnt_1',
                projectId: 'prj_1',
                milestoneId: null,
                issueId: null,
                kind: 'meeting',
                title: 'Design review',
                description: null,
                startsAt: SEPTEMBER_20_2026,
                endsAt: null,
                allDay: false,
                location: null,
                meetingUrl: null,
                createdBy: 'usr_1',
                recurrence: null,
                attendees: [],
              },
            ],
          })
        ),
      })
    )

    expect(screen.getByRole('link', { name: 'Design review' })).toHaveAttribute(
      'href',
      '/calendar/events/evt_1'
    )
  })
})

describe('MyWorkReminders', () => {
  it('states that nothing is due', async () => {
    render(await MyWorkReminders({ myWork: loaded(myWork()) }))

    expect(screen.getByText('No reminders due')).toBeInTheDocument()
  })

  it('says when a due reminder is due, without promising delivery', async () => {
    render(
      await MyWorkReminders({
        myWork: loaded(
          myWork({
            dueReminders: [
              {
                object: 'projects.reminder',
                id: 'rem_1',
                tenantId: 'tnt_1',
                issueId: 'iss_1',
                milestoneId: null,
                eventId: null,
                remindAt: null,
                offsetMinutesBeforeDue: 120,
                recurrence: null,
                channel: 'in-app',
                createdBy: 'usr_1',
                active: true,
                createdAt: 0,
                updatedAt: 0,
                dueAt: SEPTEMBER_20_2026,
              },
            ],
          })
        ),
      })
    )

    expect(
      screen.getByText('Due 2 hours before the due date')
    ).toBeInTheDocument()
    expect(screen.queryByText(/notify|email|sent/i)).not.toBeInTheDocument()
  })
})
