import { CaldavCalendarAdapter } from './caldav.js'
import { GoogleCalendarAdapter } from './google.js'
import { MicrosoftCalendarAdapter } from './microsoft.js'
import {
  WorkSyncProviderError,
  type WorkSyncProviderFactory,
} from './provider.js'

export const createSyncProvider: WorkSyncProviderFactory = (input) => {
  if (input.provider === 'GOOGLE')
    return new GoogleCalendarAdapter(input.credential)
  if (input.provider === 'MICROSOFT')
    return new MicrosoftCalendarAdapter(input.credential)
  if (input.provider === 'CALDAV')
    return new CaldavCalendarAdapter(input.credential, input.caldavUrl)

  throw new WorkSyncProviderError(
    'resource-unsupported',
    'The selected calendar provider is not supported for synchronization.'
  )
}
