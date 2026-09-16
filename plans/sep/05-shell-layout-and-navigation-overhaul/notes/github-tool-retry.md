# GitHub connector retry rule

For this integration run, a GitHub tool timeout, transient rate-limit response,
or temporary connector failure is **not** evidence that GitHub access is exhausted.

Execution rule:

1. Retry the same GitHub read/write after a short gap.
2. If the retry fails transiently again, retry at least once more when the operation is still required.
3. Preserve the exact reference needed for the retry (repository, branch/PR, SHA, workflow run ID, job ID, file path, etc.) instead of abandoning the operation.
4. Only classify an operation as blocked when repeated retries produce a stable non-transient result such as a real permission denial, unsupported endpoint, missing resource, or reproducible service-side failure.
5. Distinguish GitHub connector/API failures from GitHub Actions runner failures. A workflow job that repeatedly reports an empty step list and has no job log because it never started is an Actions execution problem, not proof that the connector is exhausted.

Current references worth preserving for this run:

- repository: `876-workspace/876`
- branch: `feat/shell-layout-navigation-overhaul`
- draft PR: `#478`
- App structure run: `33967835106`
- App structure job: `101310973973`
- UI tests run: `33967835071`
- Billing API quality run: `33967835107`

This note is operational guidance for the closeout session; it does not replace the repository's normal Git or CI rules.
