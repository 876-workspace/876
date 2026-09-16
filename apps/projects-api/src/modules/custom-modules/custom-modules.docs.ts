export const customModulesDocs = {
  auth: 'All custom-module routes require the internal key. Record, link, and report reads/writes additionally accept an interim `x-app-role-keys` header (comma-separated caller role keys). Modules with a non-empty `restrictedToRoleKeys` list require an intersection and otherwise return `projects/custom-module-forbidden`. Role keys are trusted from the app until server-side grant resolution lands.',
  pagination: 'Record listing uses cursor pagination (`limit`, `startingAfter`, `endingBefore`) with `status`, `projectId`, `q` (title search), and single-field equality (`fieldKey` + `fieldValue`) filters.',
  reports: 'Reports return JSON by default and CSV with `?format=csv` via the shared reports CSV serializer.',
} as const
