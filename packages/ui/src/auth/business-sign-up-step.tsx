'use client'

import countries from '@876/core/countries.json' with { type: 'json' }
import { useMemo, useState, type ChangeEvent } from 'react'

import { Mail, UserPlus } from '../icons'
import {
  NativeSelect,
  NativeSelectOption,
} from '../components/native-select'
import {
  Field,
  Notice,
  PasswordField,
  StepForm,
  SubmitButton,
} from './components'
import type { AuthFlowController } from './use-auth-flow'

/**
 * Owner profile and organization details for business sign-up.
 *
 * Country is a required canonical provisioning routing fact. The selector is
 * sourced from the same `@876/core/countries.json` catalog validated by the
 * Account SDK and Core API; arbitrary country text never enters the flow.
 */
export function BusinessSignUpStep({ flow }: { flow: AuthFlowController }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const busy = flow.state.status === 'submitting'

  const countryOptions = useMemo(
    () =>
      [...countries].sort((left, right) => left.name.localeCompare(right.name)),
    []
  )

  return (
    <StepForm
      onSubmit={() =>
        void flow.actions.submitBusinessProfile({
          email,
          password,
          firstName,
          lastName,
          organizationName,
          countryCode,
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="auth-business-first-name"
          label="First name"
          autoComplete="given-name"
          autoFocus
          required
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <Field
          id="auth-business-last-name"
          label="Last name"
          autoComplete="family-name"
          required
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>

      <Field
        id="auth-business-organization-name"
        label="Organization name"
        autoComplete="organization"
        required
        value={organizationName}
        onChange={(event) => setOrganizationName(event.target.value)}
      />

      <label
        htmlFor="auth-business-country"
        className="flex w-full flex-col gap-1.5 text-sm font-medium text-[var(--color-base-content)]"
      >
        Country
        <NativeSelect
          id="auth-business-country"
          name="countryCode"
          autoComplete="country"
          required
          className="w-full"
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
        >
          <NativeSelectOption value="" disabled>
            Select country
          </NativeSelectOption>
          {countryOptions.map((country) => (
            <NativeSelectOption
              key={country.countryCode}
              value={country.countryCode}
            >
              {country.flag} {country.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

      <Field
        id="auth-business-email"
        label="Email"
        icon={<Mail aria-hidden="true" className="h-[1em]" />}
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <PasswordField
        id="auth-business-password"
        name="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setPassword(event.target.value)
        }
        onBlur={() => {}}
      />

      <SubmitButton busy={busy}>
        {busy ? (
          'Creating workspace...'
        ) : (
          <>
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Create workspace
          </>
        )}
      </SubmitButton>

      <Notice notice={flow.state.notice} />
    </StepForm>
  )
}
