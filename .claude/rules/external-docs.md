# External Docs — read the current contract, never recall it

Read this before writing or reviewing **any** code that talks to something outside
this repository: a provider REST API, an SDK, a framework API, a protocol, a CLI,
or a DNS/DKIM record set.

## The rule

**An external contract is verified from its current documentation at the moment
you write the code. Never from memory, never from an older file in this repo, and
never from another agent's summary.**

A model's training data has a cutoff. Provider APIs do not. The gap between them
is silent: the code compiles, the tests pass against your own mock, and the call
fails — or worse, half-succeeds — only against the live service. Every layer of
verification inside this repository is blind to it, because the mock encodes the
same wrong assumption as the implementation.

## What this requires, concretely

1. **Fetch the doc page before writing the integration.** Use the Browserbase
   `browse` CLI (`.claude/rules` → root `CLAUDE.md` → "Browserbase is the only
   web-search path"). For Next.js, read the version-matched docs bundled at
   `node_modules/next/dist/docs/` instead — they match the installed version,
   which a web result may not.
2. **Pin the exact spellings** the contract depends on, and treat each as a fact
   that needs a source: endpoint paths, HTTP methods, request and response field
   names, enum/status values, header names (especially idempotency and signature
   headers), signature algorithms and what string is signed, tolerance windows,
   error codes, rate limits, and size/count caps.
3. **Record where each came from.** A provider adapter carries a comment naming
   the documented contract it implements and the date it was verified. That is the
   one comment style this repo wants: it explains a constraint you cannot see from
   the code.
4. **A mock is not evidence.** A test that asserts our adapter sends what we
   decided to send proves only self-consistency. State plainly, in the report or
   PR, that the live contract was verified against documentation — or that it was
   not.
5. **Check credential scope, not just credential presence.** Provider keys are
   often scoped (a send-only key cannot manage domains). A key that authenticates
   is not a key that authorizes the calls you need; confirm the scope the feature
   actually requires.
6. **When the docs and an existing implementation in this repo disagree, the docs
   win** — and the disagreement is a finding to report, not something to quietly
   normalize in passing.

## Delegation

Every brief that touches an external contract must say which docs to read and
require the delegate to cite them. A free-tier delegate will otherwise implement
from its training data with complete confidence. Ask for a numbered mismatch list
with `file:line` and the documented behaviour beside ours, so the comparison is
reviewable rather than asserted.

Prefer giving a delegate the **excerpt** of the contract it needs over a link it
may not fetch.

## Do not

- Do not implement a provider call from memory of its API.
- Do not copy an endpoint shape from an older adapter in this repo and assume it
  is still current.
- Do not accept a delegate's claim about an external contract without a source.
- Do not treat a passing mocked test as verification of a wire contract.
- Do not assume a working credential carries the scope a new feature needs.
