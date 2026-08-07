/**
 * OpenAPI prose for the Directory module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

const _ADMIN_401 = {
  401: { description: 'Missing or invalid internal key.' },
} as const

const _ADMIN_403 = {
  403: { description: 'Caller is not an admin.' },
} as const

const _ADMIN = { ..._ADMIN_401, ..._ADMIN_403 } as const

const _API_KEY_401 = {
  401: { description: 'Missing or invalid API key.' },
} as const

export const CREATE_BANK_SUMMARY = 'Create bank'

export const CREATE_BANK_DESCRIPTION = 'Creates a new bank. **Admin only**.'

export const CREATE_BANK_RESPONSES = { ..._ADMIN } as const

export const CREATE_BANK_BRANCH_SUMMARY = 'Create bank branch'

export const CREATE_BANK_BRANCH_DESCRIPTION =
  'Creates a new branch for the specified bank. **Admin only**.'

export const CREATE_BANK_BRANCH_RESPONSES = { ..._ADMIN } as const

export const CREATE_CREDIT_UNION_SUMMARY = 'Create credit union'

export const CREATE_CREDIT_UNION_DESCRIPTION =
  'Creates a new credit union. **Admin only**.'

export const CREATE_CREDIT_UNION_RESPONSES = { ..._ADMIN } as const

export const CREATE_CREDIT_UNION_BRANCH_SUMMARY = 'Create credit union branch'

export const CREATE_CREDIT_UNION_BRANCH_DESCRIPTION =
  'Creates a new branch for the specified credit union. **Admin only**.'

export const CREATE_CREDIT_UNION_BRANCH_RESPONSES = { ..._ADMIN } as const

export const CREATE_BANK_ACCOUNT_SUMMARY = 'Create bank account'

export const CREATE_BANK_ACCOUNT_DESCRIPTION =
  'Creates a new bank account. **Admin only**.'

export const CREATE_BANK_ACCOUNT_RESPONSES = { ..._ADMIN } as const

export const CREATE_MINISTRY_SUMMARY = 'Create ministry'

export const CREATE_MINISTRY_DESCRIPTION =
  'Creates a new ministry. **Admin only**.'

export const CREATE_MINISTRY_RESPONSES = { ..._ADMIN } as const

export const CREATE_MINISTRY_DEPARTMENT_SUMMARY = 'Create ministry department'

export const CREATE_MINISTRY_DEPARTMENT_DESCRIPTION =
  'Creates a new department for the specified ministry. **Admin only**.'

export const CREATE_MINISTRY_DEPARTMENT_RESPONSES = { ..._ADMIN } as const

export const CREATE_UNIVERSITY_SUMMARY = 'Create university'

export const CREATE_UNIVERSITY_DESCRIPTION =
  'Creates a new university. **Admin only**.'

export const CREATE_UNIVERSITY_RESPONSES = { ..._ADMIN } as const

export const CREATE_UNIVERSITY_CAMPUS_SUMMARY = 'Create university campus'

export const CREATE_UNIVERSITY_CAMPUS_DESCRIPTION =
  'Creates a new campus for the specified university. **Admin only**.'

export const CREATE_UNIVERSITY_CAMPUS_RESPONSES = { ..._ADMIN } as const

export const CREATE_SCHOOL_SUMMARY = 'Create secondary school'

export const CREATE_SCHOOL_DESCRIPTION =
  'Creates a new secondary school. **Admin only**.'

export const CREATE_SCHOOL_RESPONSES = { ..._ADMIN } as const

export const DELETE_BANK_SUMMARY = 'Delete bank'

export const DELETE_BANK_DESCRIPTION = 'Deletes a bank. **Admin only**.'

export const DELETE_BANK_RESPONSES = { ..._ADMIN } as const

export const DELETE_BANK_BRANCH_SUMMARY = 'Delete bank branch'

export const DELETE_BANK_BRANCH_DESCRIPTION =
  'Deletes a bank branch. **Admin only**.'

export const DELETE_BANK_BRANCH_RESPONSES = { ..._ADMIN } as const

export const DELETE_CREDIT_UNION_SUMMARY = 'Delete credit union'

export const DELETE_CREDIT_UNION_DESCRIPTION =
  'Deletes a credit union. **Admin only**.'

export const DELETE_CREDIT_UNION_RESPONSES = { ..._ADMIN } as const

export const DELETE_CREDIT_UNION_BRANCH_SUMMARY = 'Delete credit union branch'

export const DELETE_CREDIT_UNION_BRANCH_DESCRIPTION =
  'Deletes a credit union branch. **Admin only**.'

export const DELETE_CREDIT_UNION_BRANCH_RESPONSES = { ..._ADMIN } as const

export const DELETE_BANK_ACCOUNT_SUMMARY = 'Delete bank account'

export const DELETE_BANK_ACCOUNT_DESCRIPTION =
  'Deletes a bank account. **Admin only**.'

export const DELETE_BANK_ACCOUNT_RESPONSES = { ..._ADMIN } as const

export const DELETE_MINISTRY_SUMMARY = 'Delete ministry'

export const DELETE_MINISTRY_DESCRIPTION = 'Deletes a ministry. **Admin only**.'

export const DELETE_MINISTRY_RESPONSES = { ..._ADMIN } as const

export const DELETE_MINISTRY_DEPARTMENT_SUMMARY = 'Delete ministry department'

export const DELETE_MINISTRY_DEPARTMENT_DESCRIPTION =
  'Deletes a ministry department. **Admin only**.'

export const DELETE_MINISTRY_DEPARTMENT_RESPONSES = { ..._ADMIN } as const

export const DELETE_UNIVERSITY_SUMMARY = 'Delete university'

export const DELETE_UNIVERSITY_DESCRIPTION =
  'Deletes a university. **Admin only**.'

export const DELETE_UNIVERSITY_RESPONSES = { ..._ADMIN } as const

export const DELETE_UNIVERSITY_CAMPUS_SUMMARY = 'Delete university campus'

export const DELETE_UNIVERSITY_CAMPUS_DESCRIPTION =
  'Deletes a university campus. **Admin only**.'

export const DELETE_UNIVERSITY_CAMPUS_RESPONSES = { ..._ADMIN } as const

export const DELETE_SCHOOL_SUMMARY = 'Delete secondary school'

export const DELETE_SCHOOL_DESCRIPTION =
  'Deletes a secondary school. **Admin only**.'

export const DELETE_SCHOOL_RESPONSES = { ..._ADMIN } as const

export const LIST_BANKS_SUMMARY = 'List banks'

export const LIST_BANKS_DESCRIPTION =
  'Returns a paginated list of banks. Protected by API key.'

export const LIST_BANKS_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_BANK_BRANCHES_SUMMARY = 'List bank branches'

export const LIST_BANK_BRANCHES_DESCRIPTION =
  'Returns a paginated list of branches for a bank. Protected by API key.'

export const LIST_BANK_BRANCHES_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_CREDIT_UNIONS_SUMMARY = 'List credit unions'

export const LIST_CREDIT_UNIONS_DESCRIPTION =
  'Returns a paginated list of credit unions. Protected by API key.'

export const LIST_CREDIT_UNIONS_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_CREDIT_UNION_BRANCHES_SUMMARY = 'List credit union branches'

export const LIST_CREDIT_UNION_BRANCHES_DESCRIPTION =
  'Returns a paginated list of branches for a credit union. Protected by API key.'

export const LIST_CREDIT_UNION_BRANCHES_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_BANK_ACCOUNTS_SUMMARY = 'List bank accounts'

export const LIST_BANK_ACCOUNTS_DESCRIPTION =
  'Returns a paginated list of bank accounts. **Admin only**.'

export const LIST_BANK_ACCOUNTS_RESPONSES = { ..._ADMIN } as const

export const LIST_MINISTRIES_SUMMARY = 'List ministries'

export const LIST_MINISTRIES_DESCRIPTION =
  'Returns a paginated list of ministries. Protected by API key.'

export const LIST_MINISTRIES_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_MINISTRY_DEPARTMENTS_SUMMARY = 'List ministry departments'

export const LIST_MINISTRY_DEPARTMENTS_DESCRIPTION =
  'Returns a paginated list of departments for a ministry. Protected by API key.'

export const LIST_MINISTRY_DEPARTMENTS_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_UNIVERSITIES_SUMMARY = 'List universities'

export const LIST_UNIVERSITIES_DESCRIPTION =
  'Returns a paginated list of universities. Protected by API key.'

export const LIST_UNIVERSITIES_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_UNIVERSITY_CAMPUSES_SUMMARY = 'List university campuses'

export const LIST_UNIVERSITY_CAMPUSES_DESCRIPTION =
  'Returns a paginated list of campuses for a university. Protected by API key.'

export const LIST_UNIVERSITY_CAMPUSES_RESPONSES = { ..._API_KEY_401 } as const

export const LIST_SCHOOLS_SUMMARY = 'List secondary schools'

export const LIST_SCHOOLS_DESCRIPTION =
  'Returns a paginated list of secondary schools. Protected by API key.'

export const LIST_SCHOOLS_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_BANK_SUMMARY = 'Retrieve bank'

export const RETRIEVE_BANK_DESCRIPTION =
  'Returns a bank by ID. Protected by API key.'

export const RETRIEVE_BANK_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_BANK_BRANCH_SUMMARY = 'Retrieve bank branch'

export const RETRIEVE_BANK_BRANCH_DESCRIPTION =
  'Returns a bank branch by ID. Protected by API key.'

export const RETRIEVE_BANK_BRANCH_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_CREDIT_UNION_SUMMARY = 'Retrieve credit union'

export const RETRIEVE_CREDIT_UNION_DESCRIPTION =
  'Returns a credit union by ID. Protected by API key.'

export const RETRIEVE_CREDIT_UNION_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_CREDIT_UNION_BRANCH_SUMMARY =
  'Retrieve credit union branch'

export const RETRIEVE_CREDIT_UNION_BRANCH_DESCRIPTION =
  'Returns a credit union branch by ID. Protected by API key.'

export const RETRIEVE_CREDIT_UNION_BRANCH_RESPONSES = {
  ..._API_KEY_401,
} as const

export const RETRIEVE_BANK_ACCOUNT_SUMMARY = 'Retrieve bank account'

export const RETRIEVE_BANK_ACCOUNT_DESCRIPTION =
  'Returns a bank account by ID. **Admin only**.'

export const RETRIEVE_BANK_ACCOUNT_RESPONSES = { ..._ADMIN } as const

export const RETRIEVE_MINISTRY_SUMMARY = 'Retrieve ministry'

export const RETRIEVE_MINISTRY_DESCRIPTION =
  'Returns a ministry by ID. Protected by API key.'

export const RETRIEVE_MINISTRY_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_MINISTRY_DEPARTMENT_SUMMARY =
  'Retrieve ministry department'

export const RETRIEVE_MINISTRY_DEPARTMENT_DESCRIPTION =
  'Returns a ministry department by ID. Protected by API key.'

export const RETRIEVE_MINISTRY_DEPARTMENT_RESPONSES = {
  ..._API_KEY_401,
} as const

export const RETRIEVE_UNIVERSITY_SUMMARY = 'Retrieve university'

export const RETRIEVE_UNIVERSITY_DESCRIPTION =
  'Returns a university by ID. Protected by API key.'

export const RETRIEVE_UNIVERSITY_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_UNIVERSITY_CAMPUS_SUMMARY = 'Retrieve university campus'

export const RETRIEVE_UNIVERSITY_CAMPUS_DESCRIPTION =
  'Returns a university campus by ID. Protected by API key.'

export const RETRIEVE_UNIVERSITY_CAMPUS_RESPONSES = { ..._API_KEY_401 } as const

export const RETRIEVE_SCHOOL_SUMMARY = 'Retrieve secondary school'

export const RETRIEVE_SCHOOL_DESCRIPTION =
  'Returns a secondary school by ID. Protected by API key.'

export const RETRIEVE_SCHOOL_RESPONSES = { ..._API_KEY_401 } as const

export const UPDATE_BANK_SUMMARY = 'Update bank'

export const UPDATE_BANK_DESCRIPTION = 'Updates a bank. **Admin only**.'

export const UPDATE_BANK_RESPONSES = { ..._ADMIN } as const

export const UPDATE_BANK_BRANCH_SUMMARY = 'Update bank branch'

export const UPDATE_BANK_BRANCH_DESCRIPTION =
  'Updates a bank branch. **Admin only**.'

export const UPDATE_BANK_BRANCH_RESPONSES = { ..._ADMIN } as const

export const UPDATE_CREDIT_UNION_SUMMARY = 'Update credit union'

export const UPDATE_CREDIT_UNION_DESCRIPTION =
  'Updates a credit union. **Admin only**.'

export const UPDATE_CREDIT_UNION_RESPONSES = { ..._ADMIN } as const

export const UPDATE_CREDIT_UNION_BRANCH_SUMMARY = 'Update credit union branch'

export const UPDATE_CREDIT_UNION_BRANCH_DESCRIPTION =
  'Updates a credit union branch. **Admin only**.'

export const UPDATE_CREDIT_UNION_BRANCH_RESPONSES = { ..._ADMIN } as const

export const UPDATE_BANK_ACCOUNT_SUMMARY = 'Update bank account'

export const UPDATE_BANK_ACCOUNT_DESCRIPTION =
  'Updates a bank account. **Admin only**.'

export const UPDATE_BANK_ACCOUNT_RESPONSES = { ..._ADMIN } as const

export const UPDATE_MINISTRY_SUMMARY = 'Update ministry'

export const UPDATE_MINISTRY_DESCRIPTION = 'Updates a ministry. **Admin only**.'

export const UPDATE_MINISTRY_RESPONSES = { ..._ADMIN } as const

export const UPDATE_MINISTRY_DEPARTMENT_SUMMARY = 'Update ministry department'

export const UPDATE_MINISTRY_DEPARTMENT_DESCRIPTION =
  'Updates a ministry department. **Admin only**.'

export const UPDATE_MINISTRY_DEPARTMENT_RESPONSES = { ..._ADMIN } as const

export const UPDATE_UNIVERSITY_SUMMARY = 'Update university'

export const UPDATE_UNIVERSITY_DESCRIPTION =
  'Updates a university. **Admin only**.'

export const UPDATE_UNIVERSITY_RESPONSES = { ..._ADMIN } as const

export const UPDATE_UNIVERSITY_CAMPUS_SUMMARY = 'Update university campus'

export const UPDATE_UNIVERSITY_CAMPUS_DESCRIPTION =
  'Updates a university campus. **Admin only**.'

export const UPDATE_UNIVERSITY_CAMPUS_RESPONSES = { ..._ADMIN } as const

export const UPDATE_SCHOOL_SUMMARY = 'Update secondary school'

export const UPDATE_SCHOOL_DESCRIPTION =
  'Updates a secondary school. **Admin only**.'

export const UPDATE_SCHOOL_RESPONSES = { ..._ADMIN } as const
