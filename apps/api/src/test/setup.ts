/**
 * Per-suite test setup.
 *
 * The environment itself is set in `vitest.config.ts` under `test.env`, not
 * here: modules call `getLogger()` and read settings at import time, which
 * happens before any hook in this file runs.
 */
export {}
