import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type {
  PlatformOnboardingCatalog,
  PlatformOnboardingSession,
  PlatformOnboardingTargetType,
  PlatformOnboardingValidation,
} from '../types'

function onboardingTargetPath(
  targetType: PlatformOnboardingTargetType,
  targetKey: string
) {
  return `${encodeURIComponent(targetType)}/${encodeURIComponent(targetKey)}`
}

/** `platform.onboarding.*` — organization/application onboarding catalog and answers. */
export function createPlatformOnboardingResource(runtime: PlatformRuntime) {
  return {
    /** Retrieves an onboarding catalog for an organization or app target. */
    retrieveCatalog(
      targetType: PlatformOnboardingTargetType,
      targetKey: string,
      countryCode = 'JM'
    ) {
      return platformRequest<PlatformOnboardingCatalog>(runtime, {
        method: 'GET',
        path: `/onboarding/catalog/${onboardingTargetPath(targetType, targetKey)}`,
        query: { country_code: countryCode },
      })
    },

    /** Retrieves an organization's onboarding session. */
    retrieve(
      orgId: string,
      targetType: PlatformOnboardingTargetType,
      targetKey: string,
      countryCode = 'JM'
    ) {
      return platformRequest<PlatformOnboardingSession>(runtime, {
        method: 'GET',
        path: `/onboarding/organizations/${encodeURIComponent(orgId)}/${onboardingTargetPath(targetType, targetKey)}`,
        query: { country_code: countryCode },
      })
    },

    /** Replaces an organization's saved onboarding answers. */
    replaceAnswers(
      orgId: string,
      targetType: PlatformOnboardingTargetType,
      targetKey: string,
      params: { countryCode: string; answers: Record<string, unknown> }
    ) {
      return platformRequest<PlatformOnboardingSession>(runtime, {
        method: 'PUT',
        path: `/onboarding/organizations/${encodeURIComponent(orgId)}/${onboardingTargetPath(targetType, targetKey)}`,
        body: {
          country_code: params.countryCode,
          answers: params.answers,
        },
      })
    },

    /** Validates onboarding answers without saving them. */
    validate(
      targetType: PlatformOnboardingTargetType,
      targetKey: string,
      params: { countryCode: string; answers: Record<string, unknown> }
    ) {
      return platformRequest<PlatformOnboardingValidation>(runtime, {
        method: 'POST',
        path: `/onboarding/catalog/${onboardingTargetPath(targetType, targetKey)}/validate`,
        body: {
          country_code: params.countryCode,
          answers: params.answers,
        },
      })
    },

    /** Submits an organization's onboarding session. */
    submit(
      orgId: string,
      targetType: PlatformOnboardingTargetType,
      targetKey: string,
      countryCode = 'JM'
    ) {
      return platformRequest<PlatformOnboardingSession>(runtime, {
        method: 'POST',
        path: `/onboarding/organizations/${encodeURIComponent(orgId)}/${onboardingTargetPath(targetType, targetKey)}/submit`,
        query: { country_code: countryCode },
      })
    },
  }
}
