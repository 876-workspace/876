'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@876/ui/input'
import { Label } from '@876/ui/label'
import { NativeSelect, NativeSelectOption } from '@876/ui/native-select'
import {
  CatalogSectionForm,
  OnboardingStepper,
  type OnboardingAnswers,
  type OnboardingCatalog,
  type OnboardingFieldDefinition,
} from '@876/ui/onboarding'

import { request } from '@/lib/client/request'

const steps = [
  { key: 'business', label: 'Your business' },
  { key: 'setup', label: 'Set up Couriers' },
  { key: 'team', label: 'Invite your team' },
]

const btn =
  'w-full cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35'

type Completion = {
  object: 'onboarding_completion'
  tenant_id: string
  access_status: 'active'
}

type InviteBatch = {
  object: 'invite_batch'
  results: Array<{ email: string; ok: boolean; error?: string }>
}

type Props = {
  needsOrg: boolean
  orgName: string
  orgCatalog: OnboardingCatalog
  appCatalog: OnboardingCatalog
  initialOrgAnswers: Record<string, unknown>
  initialAppAnswers: Record<string, unknown>
}

function isRequiredFieldEmpty(
  field: OnboardingFieldDefinition,
  answers: OnboardingAnswers
) {
  const isRequired =
    field.required ||
    (field.required_when != null &&
      answers[field.required_when.field_key] === field.required_when.equals)

  if (!isRequired) return false

  const value = answers[field.key]
  return typeof value !== 'string' || !value.trim()
}

function hasMissingRequiredFields(
  catalog: OnboardingCatalog,
  answers: OnboardingAnswers
) {
  return catalog.sections.some((section) =>
    section.fields.some((field) => isRequiredFieldEmpty(field, answers))
  )
}

function applyAnswer(answers: OnboardingAnswers, key: string, value: unknown) {
  return { ...answers, [key]: value }
}

export function OnboardingWizard({
  needsOrg,
  orgName,
  orgCatalog,
  appCatalog,
  initialOrgAnswers,
  initialAppAnswers,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [organizationName, setOrganizationName] = useState('')
  const [orgCreated, setOrgCreated] = useState(false)
  const [orgAnswers, setOrgAnswers] =
    useState<OnboardingAnswers>(initialOrgAnswers)
  const [appAnswers, setAppAnswers] =
    useState<OnboardingAnswers>(initialAppAnswers)
  const [teamEmails, setTeamEmails] = useState(['', '', ''])
  const [teamRole, setTeamRole] = useState<'member' | 'admin'>('member')
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteResults, setInviteResults] = useState<InviteBatch['results']>([])
  const [pending, setPending] = useState(false)

  const businessDisabled =
    pending ||
    hasMissingRequiredFields(orgCatalog, orgAnswers) ||
    (needsOrg && !orgCreated && !organizationName.trim())
  const setupDisabled =
    pending || hasMissingRequiredFields(appCatalog, appAnswers)
  const inviteEmails = teamEmails
    .map((email) => email.trim())
    .filter((email) => email.length > 0)
  const invitesDisabled = pending || inviteEmails.length === 0

  function navigate() {
    router.push('/')
    router.refresh()
  }

  function ensurePlatformName(answers: OnboardingAnswers) {
    if (
      typeof answers.platform_name === 'string' &&
      answers.platform_name.trim()
    )
      return answers

    const fallback = needsOrg ? organizationName.trim() : orgName.trim()
    if (!fallback) return answers

    return { ...answers, platform_name: fallback }
  }

  async function saveAnswers(target: 'organization' | 'application') {
    const answers = target === 'organization' ? orgAnswers : appAnswers

    return request<unknown>('/api/manage/onboarding/answers', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target, answers }),
    })
  }

  async function handleBusinessContinue() {
    setError(null)
    setPending(true)

    const createOrganization = needsOrg && !orgCreated
    const result = createOrganization
      ? await request<unknown>('/api/manage/onboarding/organization', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: organizationName, answers: orgAnswers }),
        })
      : await saveAnswers('organization')
    setPending(false)

    if (result.error) {
      if (result.error.code === 'auth/session-invalid') {
        window.location.assign('/login')
        return
      }

      setError(result.error.message)
      return
    }

    if (createOrganization) setOrgCreated(true)

    setAppAnswers((current) => ensurePlatformName(current))
    setStep(2)
  }

  async function handleSetupContinue() {
    setError(null)
    setPending(true)

    const answersResult = await saveAnswers('application')
    if (answersResult.error) {
      setError(answersResult.error.message)
      setPending(false)
      return
    }

    const completeResult = await request<Completion>(
      '/api/manage/onboarding/complete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }
    )
    setPending(false)

    if (completeResult.error) {
      setError(completeResult.error.message)
      return
    }

    setCompletion(completeResult.data)
    setStep(3)
  }

  async function handleInviteSubmit() {
    setError(null)
    setInviteResults([])
    setPending(true)

    const result = await request<InviteBatch>(
      '/api/manage/onboarding/invites',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invites: inviteEmails.map((email) => ({ email, role: teamRole })),
        }),
      }
    )
    setPending(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    setInviteResults(result.data.results)
    if (result.data.results.every((invite) => invite.ok)) navigate()
  }

  return (
    <div className="space-y-1">
      <OnboardingStepper
        steps={steps}
        current={step}
        className="mb-8 sm:mb-10"
      />

      {step === 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">
            About your business
          </h2>

          {needsOrg && !orgCreated && (
            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization name</Label>
              <Input
                id="organization-name"
                value={organizationName}
                onChange={(event) =>
                  setOrganizationName(event.currentTarget.value)
                }
                autoComplete="organization"
                disabled={pending}
                className="h-11"
              />
            </div>
          )}

          {orgCatalog.sections.map((section) => (
            <CatalogSectionForm
              key={section.key}
              section={section}
              values={orgAnswers}
              onChange={(key, value) =>
                setOrgAnswers((current) => applyAnswer(current, key, value))
              }
              disabled={pending}
            />
          ))}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <button
            type="button"
            className={btn}
            disabled={businessDisabled}
            onClick={() => void handleBusinessContinue()}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">
            Set up your workspace
          </h2>

          {appCatalog.sections.map((section) => (
            <CatalogSectionForm
              key={section.key}
              section={section}
              values={appAnswers}
              onChange={(key, value) =>
                setAppAnswers((current) => applyAnswer(current, key, value))
              }
              disabled={pending}
            />
          ))}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <button
            type="button"
            className={btn}
            disabled={setupDisabled}
            onClick={() => void handleSetupContinue()}
          >
            {pending ? 'Setting up…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">
            Invite your team
          </h2>

          <div className="space-y-4">
            {teamEmails.map((email, index) => (
              <div key={index} className="space-y-2">
                <Label
                  htmlFor={`team-email-${index}`}
                  className="text-sm font-medium"
                >
                  Email {index + 1}
                </Label>
                <Input
                  id={`team-email-${index}`}
                  type="email"
                  value={email}
                  onChange={(event) => {
                    const value = event.currentTarget.value

                    setTeamEmails((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item
                      )
                    )
                  }}
                  autoComplete="email"
                  className="h-11"
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="team-role" className="text-sm font-medium">
                Role
              </Label>
              <NativeSelect
                id="team-role"
                value={teamRole}
                onChange={(event) =>
                  setTeamRole(event.currentTarget.value as 'member' | 'admin')
                }
                className="w-full"
              >
                <NativeSelectOption value="member">Member</NativeSelectOption>
                <NativeSelectOption value="admin">Admin</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {inviteResults.some((invite) => !invite.ok) && (
            <div className="space-y-2">
              {inviteResults
                .filter((invite) => !invite.ok)
                .map((invite) => (
                  <p key={invite.email} className="text-destructive text-sm">
                    {invite.email}: {invite.error}
                  </p>
                ))}
            </div>
          )}

          <button
            type="button"
            className={btn}
            disabled={invitesDisabled}
            onClick={() => void handleInviteSubmit()}
          >
            Send invites
          </button>

          <button
            type="button"
            onClick={navigate}
            className="text-muted-foreground hover:text-foreground w-full py-1 text-sm transition-colors"
          >
            Skip for now
          </button>

          {completion && (
            <span className="sr-only">{completion.tenant_id}</span>
          )}
        </div>
      )}
    </div>
  )
}
