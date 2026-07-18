"""OpenAPI documentation constants for the directory domain."""

from __future__ import annotations

from typing import Any

from fastapi import status

from core.responses import ErrorEnvelope

_ADMIN_401: dict[int | str, dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    }
}
_ADMIN_403: dict[int | str, dict[str, Any]] = {
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    }
}
_ADMIN: dict[int | str, dict[str, Any]] = {**_ADMIN_401, **_ADMIN_403}

_API_KEY_401: dict[int | str, dict[str, Any]] = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid API key.",
    }
}

# --- CREATE ---

CREATE_BANK_SUMMARY = "Create bank"
CREATE_BANK_DESCRIPTION = "Creates a new bank. **Admin only**."
CREATE_BANK_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_BANK_BRANCH_SUMMARY = "Create bank branch"
CREATE_BANK_BRANCH_DESCRIPTION = "Creates a new branch for the specified bank. **Admin only**."
CREATE_BANK_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_CREDIT_UNION_SUMMARY = "Create credit union"
CREATE_CREDIT_UNION_DESCRIPTION = "Creates a new credit union. **Admin only**."
CREATE_CREDIT_UNION_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_CREDIT_UNION_BRANCH_SUMMARY = "Create credit union branch"
CREATE_CREDIT_UNION_BRANCH_DESCRIPTION = "Creates a new branch for the specified credit union. **Admin only**."
CREATE_CREDIT_UNION_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_BANK_ACCOUNT_SUMMARY = "Create bank account"
CREATE_BANK_ACCOUNT_DESCRIPTION = "Creates a new bank account. **Admin only**."
CREATE_BANK_ACCOUNT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_MINISTRY_SUMMARY = "Create ministry"
CREATE_MINISTRY_DESCRIPTION = "Creates a new ministry. **Admin only**."
CREATE_MINISTRY_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_MINISTRY_DEPARTMENT_SUMMARY = "Create ministry department"
CREATE_MINISTRY_DEPARTMENT_DESCRIPTION = "Creates a new department for the specified ministry. **Admin only**."
CREATE_MINISTRY_DEPARTMENT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_UNIVERSITY_SUMMARY = "Create university"
CREATE_UNIVERSITY_DESCRIPTION = "Creates a new university. **Admin only**."
CREATE_UNIVERSITY_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_UNIVERSITY_CAMPUS_SUMMARY = "Create university campus"
CREATE_UNIVERSITY_CAMPUS_DESCRIPTION = "Creates a new campus for the specified university. **Admin only**."
CREATE_UNIVERSITY_CAMPUS_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

CREATE_SCHOOL_SUMMARY = "Create secondary school"
CREATE_SCHOOL_DESCRIPTION = "Creates a new secondary school. **Admin only**."
CREATE_SCHOOL_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

# --- DELETE ---

DELETE_BANK_SUMMARY = "Delete bank"
DELETE_BANK_DESCRIPTION = "Deletes a bank. **Admin only**."
DELETE_BANK_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_BANK_BRANCH_SUMMARY = "Delete bank branch"
DELETE_BANK_BRANCH_DESCRIPTION = "Deletes a bank branch. **Admin only**."
DELETE_BANK_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_CREDIT_UNION_SUMMARY = "Delete credit union"
DELETE_CREDIT_UNION_DESCRIPTION = "Deletes a credit union. **Admin only**."
DELETE_CREDIT_UNION_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_CREDIT_UNION_BRANCH_SUMMARY = "Delete credit union branch"
DELETE_CREDIT_UNION_BRANCH_DESCRIPTION = "Deletes a credit union branch. **Admin only**."
DELETE_CREDIT_UNION_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_BANK_ACCOUNT_SUMMARY = "Delete bank account"
DELETE_BANK_ACCOUNT_DESCRIPTION = "Deletes a bank account. **Admin only**."
DELETE_BANK_ACCOUNT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_MINISTRY_SUMMARY = "Delete ministry"
DELETE_MINISTRY_DESCRIPTION = "Deletes a ministry. **Admin only**."
DELETE_MINISTRY_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_MINISTRY_DEPARTMENT_SUMMARY = "Delete ministry department"
DELETE_MINISTRY_DEPARTMENT_DESCRIPTION = "Deletes a ministry department. **Admin only**."
DELETE_MINISTRY_DEPARTMENT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_UNIVERSITY_SUMMARY = "Delete university"
DELETE_UNIVERSITY_DESCRIPTION = "Deletes a university. **Admin only**."
DELETE_UNIVERSITY_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_UNIVERSITY_CAMPUS_SUMMARY = "Delete university campus"
DELETE_UNIVERSITY_CAMPUS_DESCRIPTION = "Deletes a university campus. **Admin only**."
DELETE_UNIVERSITY_CAMPUS_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

DELETE_SCHOOL_SUMMARY = "Delete secondary school"
DELETE_SCHOOL_DESCRIPTION = "Deletes a secondary school. **Admin only**."
DELETE_SCHOOL_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

# --- LIST ---

LIST_BANKS_SUMMARY = "List banks"
LIST_BANKS_DESCRIPTION = "Returns a paginated list of banks. Protected by API key."
LIST_BANKS_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_BANK_BRANCHES_SUMMARY = "List bank branches"
LIST_BANK_BRANCHES_DESCRIPTION = "Returns a paginated list of branches for a bank. Protected by API key."
LIST_BANK_BRANCHES_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_CREDIT_UNIONS_SUMMARY = "List credit unions"
LIST_CREDIT_UNIONS_DESCRIPTION = "Returns a paginated list of credit unions. Protected by API key."
LIST_CREDIT_UNIONS_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_CREDIT_UNION_BRANCHES_SUMMARY = "List credit union branches"
LIST_CREDIT_UNION_BRANCHES_DESCRIPTION = "Returns a paginated list of branches for a credit union. Protected by API key."
LIST_CREDIT_UNION_BRANCHES_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_BANK_ACCOUNTS_SUMMARY = "List bank accounts"
LIST_BANK_ACCOUNTS_DESCRIPTION = "Returns a paginated list of bank accounts. **Admin only**."
LIST_BANK_ACCOUNTS_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

LIST_MINISTRIES_SUMMARY = "List ministries"
LIST_MINISTRIES_DESCRIPTION = "Returns a paginated list of ministries. Protected by API key."
LIST_MINISTRIES_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_MINISTRY_DEPARTMENTS_SUMMARY = "List ministry departments"
LIST_MINISTRY_DEPARTMENTS_DESCRIPTION = "Returns a paginated list of departments for a ministry. Protected by API key."
LIST_MINISTRY_DEPARTMENTS_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_UNIVERSITIES_SUMMARY = "List universities"
LIST_UNIVERSITIES_DESCRIPTION = "Returns a paginated list of universities. Protected by API key."
LIST_UNIVERSITIES_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_UNIVERSITY_CAMPUSES_SUMMARY = "List university campuses"
LIST_UNIVERSITY_CAMPUSES_DESCRIPTION = "Returns a paginated list of campuses for a university. Protected by API key."
LIST_UNIVERSITY_CAMPUSES_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

LIST_SCHOOLS_SUMMARY = "List secondary schools"
LIST_SCHOOLS_DESCRIPTION = "Returns a paginated list of secondary schools. Protected by API key."
LIST_SCHOOLS_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

# --- RETRIEVE ---

RETRIEVE_BANK_SUMMARY = "Retrieve bank"
RETRIEVE_BANK_DESCRIPTION = "Returns a bank by ID. Protected by API key."
RETRIEVE_BANK_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_BANK_BRANCH_SUMMARY = "Retrieve bank branch"
RETRIEVE_BANK_BRANCH_DESCRIPTION = "Returns a bank branch by ID. Protected by API key."
RETRIEVE_BANK_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_CREDIT_UNION_SUMMARY = "Retrieve credit union"
RETRIEVE_CREDIT_UNION_DESCRIPTION = "Returns a credit union by ID. Protected by API key."
RETRIEVE_CREDIT_UNION_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_CREDIT_UNION_BRANCH_SUMMARY = "Retrieve credit union branch"
RETRIEVE_CREDIT_UNION_BRANCH_DESCRIPTION = "Returns a credit union branch by ID. Protected by API key."
RETRIEVE_CREDIT_UNION_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_BANK_ACCOUNT_SUMMARY = "Retrieve bank account"
RETRIEVE_BANK_ACCOUNT_DESCRIPTION = "Returns a bank account by ID. **Admin only**."
RETRIEVE_BANK_ACCOUNT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

RETRIEVE_MINISTRY_SUMMARY = "Retrieve ministry"
RETRIEVE_MINISTRY_DESCRIPTION = "Returns a ministry by ID. Protected by API key."
RETRIEVE_MINISTRY_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_MINISTRY_DEPARTMENT_SUMMARY = "Retrieve ministry department"
RETRIEVE_MINISTRY_DEPARTMENT_DESCRIPTION = "Returns a ministry department by ID. Protected by API key."
RETRIEVE_MINISTRY_DEPARTMENT_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_UNIVERSITY_SUMMARY = "Retrieve university"
RETRIEVE_UNIVERSITY_DESCRIPTION = "Returns a university by ID. Protected by API key."
RETRIEVE_UNIVERSITY_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_UNIVERSITY_CAMPUS_SUMMARY = "Retrieve university campus"
RETRIEVE_UNIVERSITY_CAMPUS_DESCRIPTION = "Returns a university campus by ID. Protected by API key."
RETRIEVE_UNIVERSITY_CAMPUS_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

RETRIEVE_SCHOOL_SUMMARY = "Retrieve secondary school"
RETRIEVE_SCHOOL_DESCRIPTION = "Returns a secondary school by ID. Protected by API key."
RETRIEVE_SCHOOL_RESPONSES: dict[int | str, dict[str, Any]] = {**_API_KEY_401}

# --- UPDATE ---

UPDATE_BANK_SUMMARY = "Update bank"
UPDATE_BANK_DESCRIPTION = "Updates a bank. **Admin only**."
UPDATE_BANK_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_BANK_BRANCH_SUMMARY = "Update bank branch"
UPDATE_BANK_BRANCH_DESCRIPTION = "Updates a bank branch. **Admin only**."
UPDATE_BANK_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_CREDIT_UNION_SUMMARY = "Update credit union"
UPDATE_CREDIT_UNION_DESCRIPTION = "Updates a credit union. **Admin only**."
UPDATE_CREDIT_UNION_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_CREDIT_UNION_BRANCH_SUMMARY = "Update credit union branch"
UPDATE_CREDIT_UNION_BRANCH_DESCRIPTION = "Updates a credit union branch. **Admin only**."
UPDATE_CREDIT_UNION_BRANCH_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_BANK_ACCOUNT_SUMMARY = "Update bank account"
UPDATE_BANK_ACCOUNT_DESCRIPTION = "Updates a bank account. **Admin only**."
UPDATE_BANK_ACCOUNT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_MINISTRY_SUMMARY = "Update ministry"
UPDATE_MINISTRY_DESCRIPTION = "Updates a ministry. **Admin only**."
UPDATE_MINISTRY_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_MINISTRY_DEPARTMENT_SUMMARY = "Update ministry department"
UPDATE_MINISTRY_DEPARTMENT_DESCRIPTION = "Updates a ministry department. **Admin only**."
UPDATE_MINISTRY_DEPARTMENT_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_UNIVERSITY_SUMMARY = "Update university"
UPDATE_UNIVERSITY_DESCRIPTION = "Updates a university. **Admin only**."
UPDATE_UNIVERSITY_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_UNIVERSITY_CAMPUS_SUMMARY = "Update university campus"
UPDATE_UNIVERSITY_CAMPUS_DESCRIPTION = "Updates a university campus. **Admin only**."
UPDATE_UNIVERSITY_CAMPUS_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}

UPDATE_SCHOOL_SUMMARY = "Update secondary school"
UPDATE_SCHOOL_DESCRIPTION = "Updates a secondary school. **Admin only**."
UPDATE_SCHOOL_RESPONSES: dict[int | str, dict[str, Any]] = {**_ADMIN}
