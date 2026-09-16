# React Native / Expo Docs & AI Correctness Guardrails

- **Run ID:** `2026-09-16-projects-mobile`
- **Status:** binding for every Projects Mobile implementation phase
- **Audience:** local Muse Spark 1.3 Contributor through Codex, reviewers, and any replacement implementation agent
- **Purpose:** force current-doc verification and prevent plausible-but-wrong React Native / Expo code from entering 876

## 1. This file is binding, not background reading

Muse is not a frontier model and may confidently produce stale React Native, Expo, navigation, auth, Metro, or mobile-performance patterns. Do not treat familiarity with React web as evidence that a React Native implementation is correct.

**Before every implementation phase that touches native/mobile code, re-open the current official documentation relevant to that phase.** The links in this file are starting points, not frozen truth.

A phase may not be called ready merely because the code typechecks.

For each phase, the local driver must:

1. identify the framework/library APIs the phase relies on;
2. retrieve the current official documentation for those APIs at execution time;
3. confirm that the docs apply to the selected Expo SDK / React Native version;
4. record the docs consulted, access date, and relevant current package/version in the phase report;
5. compare generated code against the anti-pattern checks in this file;
6. run the applicable verification commands;
7. stop and report instead of guessing when current documentation cannot be verified.

If the implementation and current official docs disagree, **the current docs win unless the repository has a deliberate, documented compatibility exception.**

---

## 2. Documentation authority order

Use this order when sources conflict:

1. **The selected Expo SDK's current official documentation** — <https://docs.expo.dev/>
2. **Expo changelog / release notes for that SDK** — <https://expo.dev/changelog>
3. **React Native current/versioned official documentation** — <https://reactnative.dev/>
4. **The library's current official documentation** (for example TanStack Query)
5. **The installed package's own types/source/changelog**
6. Repository-established 876 rules and an existing proven implementation
7. Community material only when official documentation is silent, and then it must be clearly identified as non-authoritative

Do not use as implementation authority:

- random Medium posts;
- Stack Overflow answers without version verification;
- old Expo Router examples copied from SDK 52 or earlier;
- old React Navigation tutorials when Expo Router owns the navigation layer;
- generated snippets from another model;
- remembered APIs from a previous React Native version;
- archived React Native docs when current/versioned docs exist.

---

## 3. Mandatory freshness check at the start of every mobile phase

Run a current-doc reconnaissance before code changes.

At minimum establish:

```text
current stable Expo SDK
selected Expo SDK for this app
React Native version targeted by that Expo SDK
React version targeted by that Expo SDK
minimum Node version for that Expo SDK
expo-router recommended version
whether any relevant package/API is deprecated
whether a development-client rebuild is required for the planned change
```

As of **2026-09-16**, the official Expo SDK reference says stable SDK 57 targets:

```text
Expo SDK 57
React Native 0.86
React 19.2.3
minimum Node 22.13.x
```

Official reference:

- <https://docs.expo.dev/versions/latest/>

However, this is **not permission to hard-code those versions forever**. Re-check them at execution time.

### Important current pre-release trap

As of 2026-09-16:

- React Native 0.87 is already a stable standalone React Native release;
- Expo SDK 57 still targets React Native 0.86;
- Expo SDK 58 is **beta** and currently includes React Native 0.88 RC.

Therefore:

> **"Newest React Native" is not the same as "correct React Native for the selected stable Expo SDK."**

Do not independently upgrade React Native past the version supported by the selected Expo SDK. Do not move the project to Expo SDK 58 beta merely because it is newer unless the user explicitly approves beta adoption after reviewing the tradeoff.

Current references:

- Expo SDK matrix: <https://docs.expo.dev/versions/latest/>
- Expo SDK 57 release notes: <https://expo.dev/changelog/sdk-57>
- Expo SDK 58 beta notes: <https://expo.dev/changelog/sdk-58-beta>
- React Native releases/blog: <https://reactnative.dev/blog>

The stable-vs-beta decision must be recorded in the plan if it changes.

---

## 4. Package installation rule: let Expo choose native-compatible versions

For Expo-managed/native packages, prefer:

```bash
pnpm expo install <package>
```

rather than blindly using:

```bash
pnpm add <package>@latest
```

The point is to install versions compatible with the selected Expo SDK.

Examples:

```bash
pnpm expo install expo-dev-client
pnpm expo install expo-auth-session expo-crypto
pnpm expo install expo-web-browser
pnpm expo install expo-secure-store
pnpm expo install react-native-safe-area-context
```

Do not manually pin versions from this document without first checking current Expo package guidance.

After dependency changes, use the applicable checks:

```bash
pnpm --filter @876/projects-mobile exec expo-doctor
pnpm --filter @876/projects-mobile exec expo install --check
```

Confirm exact CLI syntax against the current installed Expo CLI before relying on it.

---

## 5. Expo Go is not the product runtime

Projects Mobile is a production app and must use a development build.

Official docs:

- <https://docs.expo.dev/develop/development-builds/introduction/>
- <https://docs.expo.dev/develop/development-builds/use-development-builds/>
- <https://docs.expo.dev/versions/latest/sdk/dev-client/>

Guardrails:

- do not design around Expo Go limitations;
- do not claim OAuth is verified because it worked in an environment that cannot exercise the final custom app scheme;
- do not add hacks only to preserve Expo Go compatibility;
- use `expo-dev-client` and a real development build;
- when adding a library that contains native code, rebuild the development client before expecting the new native module to exist.

A JS reload cannot add native code to an already-built APK.

---

## 6. New Architecture is mandatory; do not generate legacy-architecture workarounds

For current Expo SDKs in this project line, the React Native New Architecture is not an optional toggle.

Official Expo reference:

- <https://docs.expo.dev/guides/new-architecture/>

Current Expo guidance states SDK 55+ always uses the New Architecture. A generated setting such as:

```json
{
  "newArchEnabled": false
}
```

is stale and should not be added.

Guardrails:

- do not disable the New Architecture to make an old package work;
- prefer maintained packages compatible with the selected Expo/RN release;
- investigate library compatibility before adding a native package;
- do not copy legacy bridge-specific native-module patterns without proving they are still required.

---

## 7. Monorepo / Metro anti-slop rules

Official Expo monorepo guide:

- <https://docs.expo.dev/guides/monorepos/>

Expo has first-class pnpm workspace support and automatically configures Metro for modern SDKs when using `expo/metro-config`.

Do **not** generate old monorepo boilerplate by default:

```text
watchFolders
resolver.nodeModulesPath
resolver.extraNodeModules
resolver.disableHierarchicalLookup
```

Do not add a Metro workaround because an old blog post says every monorepo needs it.

Required approach:

1. use Expo's normal config first;
2. install from the workspace root;
3. clear Metro cache when appropriate;
4. reproduce the actual resolution error;
5. inspect Expo's current monorepo docs;
6. only then add the smallest custom config, with a comment explaining the measured failure.

Do not add Babel/Metro plugins "just in case."

---

## 8. Expo Router guardrails

Official current docs:

- Router API: <https://docs.expo.dev/versions/latest/sdk/router/>
- Common navigation patterns: <https://docs.expo.dev/router/basics/common-navigation-patterns/>
- Protected routes: <https://docs.expo.dev/router/advanced/protected/>
- Authentication: <https://docs.expo.dev/router/advanced/authentication/>

### Use current protected-route patterns

SDK 53+ has Protected Routes. Do not default to an older redirect-heavy SDK 52 pattern just because it appears in historical examples.

### Do not import the wrong navigation layer

Current Expo Router docs state that SDK 56+ application code should not directly import navigation primitives from external `@react-navigation/*` packages when Expo Router exposes the equivalent API.

Before any `@react-navigation/*` application import, verify it is actually required by the current Expo Router docs.

### Protected routes are not authorization

`Stack.Protected`, `Tabs.Protected`, client redirects, hidden tabs, and route groups are UX/navigation controls only.

They do not replace Projects API authorization.

Never treat:

```ts
guard={isLoggedIn}
```

as proof the current user may read or mutate a Project or Issue.

The API still enforces membership, entitlement, module, and permission checks.

### Do not duplicate route declarations

Current Protected Routes docs warn that a screen should not be declared in multiple simultaneously active route groups. Prefer one screen declaration with the appropriate protected group.

---

## 9. OAuth/authentication guardrails

Official docs:

- Expo auth overview: <https://docs.expo.dev/develop/authentication/>
- OAuth/OIDC guide: <https://docs.expo.dev/guides/authentication/>
- AuthSession API: <https://docs.expo.dev/versions/latest/sdk/auth-session/>
- WebBrowser API: <https://docs.expo.dev/versions/latest/sdk/webbrowser/>
- Secure storage overview: <https://docs.expo.dev/develop/user-interface/store-data/>

### Mandatory rules

- use Authorization Code + PKCE for the 876 public native client;
- no OAuth client secret in JavaScript, app config, `EXPO_PUBLIC_*`, EAS-injected bundle values, or APK resources;
- use `AuthSession.makeRedirectUri()` / current documented redirect handling rather than string-building platform URLs ad hoc;
- verify current AuthSession API before using remembered hooks/methods;
- configure a real custom app scheme and development build for OAuth testing;
- store token material in `expo-secure-store`, not AsyncStorage;
- validate OAuth `state`;
- rotate refresh tokens correctly;
- single-flight token refresh;
- retry an API request once after a successful refresh, never recursively forever;
- revoke/clear the session on logout as supported by Core;
- never log authorization codes, access tokens, refresh tokens, or SecureStore values.

### Browser flow anti-patterns

Do not:

- embed a WebView for 876 OAuth simply to keep the user inside the app;
- manually implement Chrome Custom Tabs / Safari authentication when Expo AuthSession/WebBrowser owns that integration;
- add duplicate `Linking.addEventListener` auth redirect handling when the selected Expo WebBrowser/AuthSession flow explicitly does not require it;
- assume Expo Go redirect behavior equals the production development build.

---

## 10. Secret/configuration guardrails

Assume anything shipped to the app bundle can be recovered by a user.

Never embed:

```text
PROJECTS_INTERNAL_KEY
API_INTERNAL_KEY
876_app_secret_*
OAuth client secret
provider secret
database URL/private credential
```

`EXPO_PUBLIC_*` means **public**, not secret.

EAS environment variables are not a magic secret vault if their values are compiled or inlined into client code.

Public items that may legitimately ship include deliberately public service origins and OAuth public client identifiers.

---

## 11. Safe areas and edge-to-edge: do not use deprecated core `SafeAreaView`

React Native's built-in `SafeAreaView` is deprecated.

Official current reference:

- React Native deprecation: <https://reactnative.dev/docs/safeareaview>
- Expo safe-area guide: <https://docs.expo.dev/develop/user-interface/safe-areas/>

Use `react-native-safe-area-context` following the current Expo docs.

Do not blindly apply top/bottom padding constants like:

```ts
paddingTop: 44
paddingBottom: 34
```

Android 15+ edge-to-edge behavior is important in the RN 0.86 line. Test headers, tabs, sheets, keyboard behavior, and modals on the actual Android device.

React Native 0.86 release notes:

- <https://reactnative.dev/blog/2026/06/11/react-native-0.86>

---

## 12. Touch handling: prefer `Pressable`

React Native points developers to `Pressable` as the more extensive/future-proof touch API.

Reference:

- <https://reactnative.dev/docs/pressable>
- <https://reactnative.dev/docs/touchableopacity>

Do not default to old `TouchableOpacity` boilerplate for every interactive element.

Buttons/rows need:

- semantic accessibility role/label where needed;
- visible pressed/disabled/loading states;
- adequate touch target;
- no nested competing press targets without deliberate interaction design.

Do not use `Text onPress` as the default replacement for proper buttons.

---

## 13. Large collections: virtualization is mandatory

Projects, Issues, Comments, Notifications, member pickers, and activity streams can be large.

Official docs:

- FlatList: <https://reactnative.dev/docs/flatlist>
- VirtualizedList: <https://reactnative.dev/docs/virtualizedlist>
- FlatList optimization: <https://reactnative.dev/docs/optimizing-flatlist-configuration>

### Do not use `ScrollView` for unbounded server collections

Wrong default:

```tsx
<ScrollView>
  {issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)}
</ScrollView>
```

Use a virtualized list for potentially large datasets.

### Do not defeat virtualization

Avoid casually nesting a same-direction `FlatList`/`SectionList` inside an outer `ScrollView` that causes the list to expand/render as ordinary content.

Prefer one virtualized scrolling owner with header/footer components where possible.

### Server pagination stays server pagination

Do not fetch all Issues and then implement fake client pagination/filtering.

Use existing cursor/query semantics and TanStack infinite queries where applicable.

### Keep rows cheap

Current RN list guidance recommends lightweight list items, stable keys, and careful render functions.

Do not add `memo`/`useCallback` everywhere mechanically. Use them where list measurements or profiling show avoidable re-renders and where stable props make memoization meaningful.

Never use the array index as the stable key for mutable/reorderable Projects data when a durable ID exists.

---

## 14. TanStack Query on React Native: do not assume browser lifecycle exists

Official current guide:

- <https://tanstack.com/query/latest/docs/framework/react/react-native>

React Native does not give TanStack Query browser `window` focus/online events.

Wire:

- `focusManager` to React Native `AppState`;
- `onlineManager` to the selected supported connectivity source (`expo-network` or another deliberately chosen canonical dependency).

Anti-patterns:

- duplicating server query results into component state just to "cache" them;
- fetching in arbitrary `useEffect` calls when a query resource already exists;
- creating a new `QueryClient` on every render;
- query keys that omit `organizationId` for tenant-scoped data;
- clearing only UI state when switching organizations while stale tenant data remains addressable under identical cache keys;
- blanket invalidation of every query after every small mutation;
- optimistic updates without a rollback/error path;
- infinite retry on authorization/validation failures.

The selected cache strategy must preserve cross-org isolation structurally in query keys, not only procedurally through `clear()` calls.

---

## 15. Forms and keyboard handling must be native-aware

React web form assumptions do not automatically transfer to mobile.

Relevant RN docs:

- TextInput: <https://reactnative.dev/docs/textinput>
- KeyboardAvoidingView: <https://reactnative.dev/docs/keyboardavoidingview>

Guardrails:

- ensure focused fields and submit controls remain reachable when the keyboard opens;
- select a documented `KeyboardAvoidingView` behavior deliberately and test Android/iOS behavior rather than copying one platform's magic offset;
- do not hard-code keyboard heights;
- do not create every form as one giant nested `ScrollView` without considering keyboard and list behavior;
- use native keyboard types, capitalization, multiline settings, return-key behavior, and autofill/content hints where appropriate;
- keep validation errors associated with their fields and accessible.

Physical Android testing is required for issue/comment composition.

---

## 16. Images and avatars: avoid wasteful raw image behavior

For network-heavy user/project avatars and future attachments, review current image guidance.

Expo Image:

- <https://docs.expo.dev/versions/latest/sdk/image/>
- <https://docs.expo.dev/develop/user-interface/assets/>

`expo-image` provides memory/disk caching and performant native implementations.

Guardrails:

- do not load full-resolution attachment images merely to render a 32px avatar/thumbnail when a suitable thumbnail exists;
- remote images need explicit layout dimensions;
- avoid unnecessary memory-only caching for large images;
- add useful accessibility labels where the image conveys information;
- do not add an image library just because an old RN tutorial uses it; confirm the current Expo-supported option first.

---

## 17. Accessibility is part of correctness

Official RN accessibility docs:

- <https://reactnative.dev/docs/accessibility>

Every implementation pass must check:

- interactive controls expose understandable accessibility labels/roles where defaults are insufficient;
- icon-only controls have labels;
- disabled/loading states remain understandable;
- text remains readable with increased font scaling where practical;
- status/priority indicators do not communicate only by color;
- touch targets are usable;
- list rows have coherent focus order;
- error messages are not visual-only decorations.

Do not postpone all accessibility until a final polish pass.

---

## 18. Native rebuild boundary: JS reloads cannot change the binary

Official development-build docs note that adding native-code libraries requires rebuilding the development client.

Reference:

- <https://docs.expo.dev/develop/development-builds/use-development-builds/>

After changing any of these, determine whether a new native build is required:

- native library dependency;
- config plugin;
- app scheme/deep-link config;
- Android/iOS permissions;
- app.json/app.config native fields;
- native runtime configuration.

Do not debug "module not found in native runtime" for hours after installing a native package into JavaScript without rebuilding the development client.

---

## 19. CNG/native directories: do not eject by reflex

Use Expo Continuous Native Generation/config plugins first.

Do not commit `android/` and `ios/` simply because an AI knows how to patch Gradle or AndroidManifest manually.

Native directories should become source-owned only after a deliberate architectural decision that current Expo/CNG/config-plugin mechanisms cannot satisfy the requirement cleanly.

If Muse proposes manual native-file edits, it must first cite the current Expo docs showing why a config plugin/app config cannot own the change.

---

## 20. EAS Update/native-runtime guardrail

If EAS Update is introduced, JS updates must match the native runtime they require.

Official docs:

- <https://docs.expo.dev/eas-update/runtime-versions/>
- <https://docs.expo.dev/eas-update/how-it-works/>
- <https://docs.expo.dev/build/updates/>

Do not publish JS that calls a native module not present in the target binary.

A change to native dependencies/config may require a new build/runtime version before an update can safely ship.

EAS Update is not required for v1; do not add it prematurely just because Expo supports it.

---

## 21. Web React patterns that are suspicious in React Native

Treat these as review alarms:

```text
<div>, <span>, <button>, <form>, <input>
className without an intentionally installed/native-compatible styling system
CSS files as the primary native styling mechanism
window/document/localStorage/sessionStorage
DOM event APIs
e.target.value
hover-only interactions
HTML dangerouslySetInnerHTML
React DOM portals
browser cookie assumptions
Next.js router/navigation imports
Next.js Server Components / Server Actions
web middleware used as a native authorization boundary
```

Some libraries intentionally provide cross-platform DOM-like primitives, but Projects Mobile should not introduce one merely to make web code copyable.

Use native components and Expo-supported APIs deliberately.

---

## 22. Do not copy web UI architecture wholesale

Reuse:

- domain contracts;
- resource clients;
- permission semantics;
- error codes;
- query/filter semantics;
- design tokens where platform-neutral;
- product vocabulary.

Do not blindly reuse:

- shadcn components;
- DOM layout components;
- Next.js layouts;
- browser route handlers;
- CSS/Tailwind assumptions unless a native styling architecture is explicitly selected;
- web-only form controls;
- server component boundaries.

Mobile screens should be native presentations over the same product domain.

---

## 23. Avoid dependency-by-habit

Before installing any React Native package, Muse must answer:

1. Does Expo SDK already provide this capability?
2. Does React Native core already provide it?
3. Does the 876 monorepo already own an equivalent platform-neutral package?
4. Is the package maintained and compatible with the selected Expo SDK/New Architecture?
5. Does it add native code and therefore require a new dev build?
6. Is the added package justified by at least one real current call site?

Do not add libraries for:

- trivial date/string utilities already available in the repo;
- global state when React/TanStack/local provider state is enough;
- navigation already owned by Expo Router;
- basic fetch wrappers already owned by `@876/core/client` / bounded product SDKs;
- UI components just to recreate web shadcn on native.

Follow `.agents/rules/ai-code-quality.md`: search first, reuse first.

---

## 24. Avoid premature abstraction

Common AI slop in a new mobile app is building a giant framework before the first screen works.

Do not create without demonstrated need:

```text
generic repository interfaces
generic API service base classes
BaseScreen / BaseViewModel hierarchies
cross-product mobile service containers
universal form renderer
universal list renderer
global event bus
custom dependency-injection framework
custom navigation wrapper around Expo Router
second error-envelope abstraction
second auth client
```

A small native app shell plus bounded service clients and feature folders is preferred.

Abstractions should appear when real repeated behavior or a security invariant requires them.

---

## 25. Hooks/effects anti-slop checklist

Reject or scrutinize code that:

- uses `useEffect` to derive state that can be computed during render;
- uses `useEffect` for every API fetch instead of the query layer;
- suppresses dependency warnings instead of fixing dependencies;
- creates request loops because state written by an effect is also its trigger;
- uses refs to hide stale-closure bugs;
- installs event listeners without returning cleanup;
- creates app-wide listeners inside frequently mounted screens;
- starts timers without cleanup;
- performs async work after unmount without cancellation/ownership handling where needed.

Do not add `eslint-disable` to silence hook rules.

---

## 26. Performance guardrails

Do not "optimize" from superstition, but do avoid known structural waste.

Check:

- unbounded lists use virtualization;
- list rows are not doing heavy parsing/formatting/network work on render;
- server filters prevent oversized payloads;
- screens do not create duplicate requests for the same resource;
- large objects are not serialized through navigation params when an ID will do;
- images are appropriately sized/cached;
- organization switching invalidates only the correct cache scope;
- expensive work is measured before adding memoization complexity.

Use React Native DevTools/profiling when there is an actual performance concern.

Do not cargo-cult `useMemo`, `useCallback`, `memo`, and custom equality functions into every component.

---

## 27. Error handling anti-slop rules

Do not reduce all mobile failures to one toast saying "Something went wrong."

Preserve the registered 876 error contract.

Distinguish at least:

```text
offline/network failure
authentication expired
permission denied
resource not found/removed
validation failure
conflict/domain rule
unexpected service failure
```

Do not swallow a failed mutation and optimistically leave UI in a successful state.

Do not expose provider/database/internal-key errors to the mobile user.

Do not create mobile-only error codes when the owning service already has the domain error.

---

## 28. Tenant isolation review is mandatory

Every server-state feature must be reviewed for cross-organization leakage.

Required checks:

- organization ID is part of every org-scoped query key;
- organization switching cannot display the previous org's rows while loading the new org;
- mutations derive authorization from the token/server access context, not client claims;
- deep links cannot retrieve an Issue in another org merely because the reference exists;
- local persisted preferences are scoped appropriately;
- logout clears sensitive caches/session state.

Test negative space, not just the happy path.

---

## 29. Production-only API means production-risk discipline

The user deliberately wants the app to always point Projects traffic at production.

Therefore during development:

- use a designated safe production test organization/account;
- never seed destructive fake data into an arbitrary live customer org;
- label development test records where appropriate;
- verify mutation scopes before bulk testing;
- do not create automated test suites that mutate live production data;
- unit/integration tests use fakes/test services, while manual phone smoke tests use carefully chosen production records.

A production-only origin is not permission to test recklessly.

---

## 30. Phase-specific current-doc map

### Scaffold / dependencies

Check immediately before scaffolding:

- <https://docs.expo.dev/versions/latest/>
- <https://expo.dev/changelog>
- <https://docs.expo.dev/guides/monorepos/>
- <https://docs.expo.dev/guides/new-architecture/>
- <https://docs.expo.dev/develop/development-builds/introduction/>

### Router / shell

- <https://docs.expo.dev/versions/latest/sdk/router/>
- <https://docs.expo.dev/router/basics/common-navigation-patterns/>
- <https://docs.expo.dev/router/advanced/protected/>

### Authentication

- <https://docs.expo.dev/develop/authentication/>
- <https://docs.expo.dev/guides/authentication/>
- <https://docs.expo.dev/versions/latest/sdk/auth-session/>
- <https://docs.expo.dev/versions/latest/sdk/webbrowser/>
- <https://docs.expo.dev/versions/latest/sdk/securestore/>

### Server data / Query

- <https://tanstack.com/query/latest/docs/framework/react/react-native>
- current TanStack Query package docs matching the installed major version

### Lists

- <https://reactnative.dev/docs/flatlist>
- <https://reactnative.dev/docs/virtualizedlist>
- <https://reactnative.dev/docs/optimizing-flatlist-configuration>

### Forms / keyboard

- <https://reactnative.dev/docs/textinput>
- <https://reactnative.dev/docs/keyboardavoidingview>

### Safe areas / Android edge-to-edge

- <https://docs.expo.dev/develop/user-interface/safe-areas/>
- <https://reactnative.dev/docs/safeareaview>
- React Native release notes for the selected version

### Images

- <https://docs.expo.dev/versions/latest/sdk/image/>
- <https://docs.expo.dev/develop/user-interface/assets/>

### EAS builds / updates

- <https://docs.expo.dev/build/introduction/>
- <https://docs.expo.dev/eas-update/runtime-versions/>
- <https://docs.expo.dev/build/updates/>

If a link moves, search the official domain rather than assuming the feature disappeared.

---

## 31. Mandatory phase report section: Current docs verification

Every Muse phase report that changes native/mobile code must contain:

```markdown
## Current docs verification

- Checked on: YYYY-MM-DD
- Expo SDK selected: ...
- React Native version for selected SDK: ...
- Relevant package versions: ...
- Official docs consulted:
  - <official URL>
  - <official URL>
- Deprecated/stale patterns explicitly avoided:
  - ...
- Any docs/repo conflict discovered:
  - ...
```

A report without this section is incomplete.

---

## 32. Mandatory diff review before accepting Muse output

Search the changed mobile files for suspicious patterns before committing/merging:

```bash
rg -n "SafeAreaView|TouchableOpacity|@react-navigation/|newArchEnabled|watchFolders|extraNodeModules|disableHierarchicalLookup|AsyncStorage|EXPO_PUBLIC_.*(SECRET|KEY|TOKEN)|PROJECTS_INTERNAL_KEY|API_INTERNAL_KEY|876_app_secret_|localhost|127\\.0\\.0\\.1|window\\.|document\\.|localStorage|sessionStorage|<div|<span|<button|className=" apps/projects-mobile packages/projects apps/projects-api
```

This is a review aid, not an automatic failure list. Some strings may be valid in tests/docs or deliberate code. Every hit must be classified, not blindly deleted.

Also search for repo-wide AI-slop escapes:

```bash
rg -n "eslint-disable|@ts-ignore|@ts-expect-error|as any" apps/projects-mobile packages/projects apps/projects-api
```

Any new hit needs explicit justification or removal under existing 876 rules.

---

## 33. Stop-and-verify conditions

Muse must stop the current phase and research before proceeding when it is about to:

- install a native package whose compatibility with the selected Expo SDK is unknown;
- use an API remembered from a prior SDK without current docs;
- patch Metro/Babel because module resolution is failing;
- add native Android/iOS files manually;
- disable the New Architecture;
- introduce a React Navigation import beside Expo Router;
- use a beta/canary package in the production baseline;
- store tokens anywhere other than a secure platform-backed store;
- add a client secret to the app;
- create a second auth/session implementation;
- create a second product API/business implementation;
- use a `ScrollView` to render an unbounded server list;
- replace server authorization with client navigation guards;
- globally change React/React Native versions to solve a local scaffold warning;
- suppress lint/type errors instead of understanding them;
- claim a physical-device behavior works without running it on the device when that behavior is device/native specific.

The correct output of a blocked phase is evidence and a plan update, not invented code.

---

## 34. Definition of acceptable Muse output

Muse output is acceptable only when it is all of the following:

- consistent with the current official docs for the selected SDK/version;
- consistent with 876 architecture and rules;
- native-first rather than web-code-translated;
- minimal in dependencies and abstractions;
- secure for a client-distributed binary;
- tenant-safe;
- testable without production mutation automation;
- verified with Expo Doctor/typecheck/lint/tests as applicable;
- manually exercised on a development build for native/device-sensitive behavior;
- reviewed against this anti-slop checklist.

"Looks like React" is not the acceptance bar. "Compiles" is not the acceptance bar. "Muse said it is standard" is not the acceptance bar.

Current documentation + repository invariants + verification are the acceptance bar.
