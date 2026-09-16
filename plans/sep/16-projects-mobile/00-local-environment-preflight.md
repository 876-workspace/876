# 876 Projects Mobile — Local Environment & Toolchain Preflight

- **Run ID:** `2026-09-16-projects-mobile`
- **Branch:** `feature/projects-mobile`
- **Audience:** local Muse Spark 1.3 Contributor through Codex
- **Purpose:** verify the development machine and required external tooling before Phase 0 reconnaissance or any Expo scaffold
- **Status:** planning-only; running checks is allowed after the user authorizes local work, but do not scaffold or implement until the master plan says to proceed

> **Read this file before `local-muse-codex-plan.md`.** Check first; install only what is missing or incompatible. Do not blindly reinstall tooling that already works.

## 0. Non-negotiable setup rules

1. Work from `/root/projects/876`.
2. Work on `feature/projects-mobile` unless a later phase brief explicitly creates a phase branch.
3. Use **pnpm only** inside this repository. Root `package.json` pins `pnpm@11.3.0` and requires Node `>=22.13`.
4. Do **not** install the deprecated global `expo-cli` package. Modern Expo CLI comes from the project's `expo` package. Use `pnpm create expo-app`, `pnpm expo ...`, or `pnpm dlx ...` as appropriate.
5. Do **not** install Android Studio, a full Android SDK, Java, or ADB on the Hetzner server merely to get started. The default path for this project is an EAS cloud development build installed on the user's physical Android phone, while Metro runs remotely through an Expo tunnel.
6. Do **not** put `PROJECTS_INTERNAL_KEY`, app secrets, OAuth client secrets, or any other server secret into Expo/EAS environment variables or the mobile bundle.
7. Expo Go may be present on the phone and can be used for a temporary smoke check where compatible, but this project targets a **development build** with `expo-dev-client` for real work.
8. Do not change the root React version during environment setup. Expo compatibility must be evaluated only after the scaffold exists and `expo-doctor` has evidence.
9. Do not change `package.json`, the lockfile, Expo config, EAS config, or source code during this preflight unless the user has separately authorized implementation.

---

# 1. Verify the repository and machine first

Run from the repository root:

```bash
cd /root/projects/876

pwd
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
uname -a
free -h
df -h .
```

Expected branch after this planning handoff:

```text
feature/projects-mobile
```

The original integration branch base was:

```text
main @ 8304130e0318d72aff50c2f0d222ae7f47c488d3
```

Do **not** require HEAD to still equal that SHA. The branch may have advanced. Instead:

```bash
git fetch origin
git checkout feature/projects-mobile
git pull --ff-only origin feature/projects-mobile
```

Then inspect any commits newer than the planning handoff before proceeding.

If `git status --short` is not clean, determine whether the changes belong to the user or another agent before touching them. Never discard unknown work.

---

# 2. Verify Git and GitHub access

Required:

```bash
git --version
gh --version
gh auth status
```

The local driver must be able to fetch/push the 876 repository and later create/manage phase PRs when the user authorizes them.

If `gh` is missing, install GitHub CLI using the host's supported package mechanism. Do not add `gh` as a repository dependency.

If GitHub authentication is missing, authenticate interactively:

```bash
gh auth login
```

Do not paste GitHub tokens into plan files, shell history, source code, or AI prompts.

Useful repository verification:

```bash
gh repo view 876-workspace/876 --json nameWithOwner,defaultBranchRef,url
```

---

# 3. Verify Node.js

Expo currently requires Node.js LTS. The 876 root additionally requires:

```text
Node >= 22.13
```

Check:

```bash
node --version
node -p "process.version"
node -p "process.platform + ' ' + process.arch"
```

For this run, **Node 22 LTS** is the safest default if the host needs a Node installation or version switch because it satisfies the repository floor and Expo's LTS guidance.

If Node is missing or below `22.13`, use the host's existing Node version manager when available. Example with `nvm`:

```bash
command -v nvm || true
nvm install 22
nvm use 22
node --version
```

Do not replace a working system Node installation blindly. Record the detected version in the reconnaissance report.

---

# 4. Verify pnpm

The repository declares:

```text
packageManager: pnpm@11.3.0
```

Check:

```bash
pnpm --version
```

Expected for repository parity:

```text
11.3.0
```

If pnpm is missing or the local agent decides exact parity is necessary, prefer Corepack when available:

```bash
corepack --version || true
corepack enable
corepack prepare pnpm@11.3.0 --activate
pnpm --version
```

If Corepack is unavailable, install pnpm outside the repository using the normal host toolchain, for example:

```bash
npm install --global pnpm@11.3.0
pnpm --version
```

Using npm here only bootstraps the package manager itself; **inside the 876 repository all project dependency operations must use pnpm**.

Do not run `npm install`, `yarn`, or Bun for repository dependencies.

---

# 5. Verify the existing workspace install

Check whether dependencies already exist:

```bash
test -d node_modules && echo "node_modules present" || echo "node_modules missing"
pnpm --version
```

If `node_modules` is missing or the checked-out branch requires an install, use the committed lockfile:

```bash
pnpm install --frozen-lockfile
```

Before running that command, confirm the current branch is correct and the working tree is clean.

Afterwards:

```bash
git status --short
```

A frozen install must not rewrite `pnpm-lock.yaml`. If it does, stop and investigate rather than committing an unexplained lockfile change.

---

# 6. Verify Codex and the Muse provider

The user wants this implementation driven with **Muse Spark 1.3 Contributor through Codex**.

Check Codex:

```bash
codex --version
command -v codex
```

Do not print `~/.codex` secrets or API keys.

Probe the configured Muse profile exactly as the repository's `.agents/rules/cli.md` prescribes:

```bash
codex exec -p muse --dangerously-bypass-approvals-and-sandbox \
  "Reply with exactly OK" < /dev/null
```

Expected semantic result:

```text
OK
```

A process exit code of `0` by itself is not proof that Muse worked. Read the actual output.

Do **not** pass `-m` with `-p muse`; it overrides the configured Muse model profile.

If the profile does not work, inspect the Codex configuration without exposing credentials and fix the local tool setup before implementation.

---

# 7. Optional but recommended: Expo's official Codex plugin/MCP

Current Expo documentation provides an official Codex plugin that installs Expo skills and registers the Expo MCP server.

This is **helpful, not a repository dependency**. It should not block implementation if the installed Codex build does not support the plugin command.

First inspect the local Codex help/version rather than assuming support:

```bash
codex --help
```

If supported and not already installed:

```bash
codex plugin add expo@openai-curated
```

Then authenticate the Expo MCP connection:

```bash
codex mcp login expo
```

Never commit Codex plugin state, MCP credentials, or account tokens into the 876 repository.

Official reference:

```text
https://docs.expo.dev/get-started/create-a-project/
```

---

# 8. Verify Expo tooling without installing legacy global Expo CLI

The user may already have Expo installed from prior work. Record what exists:

```bash
command -v expo || true
expo --version || true
```

This check is informational only.

If the detected executable is the old globally installed `expo-cli`, **do not use it as the project toolchain** and do not uninstall it merely for this project unless it causes a real PATH conflict.

Before the app exists, verify that the current create tool is reachable through pnpm:

```bash
pnpm create expo-app --help
```

Do not scaffold during planning/preflight.

Once `apps/projects-mobile` exists, the authoritative Expo CLI becomes the app-local version. Check it from that app:

```bash
cd /root/projects/876/apps/projects-mobile
pnpm expo --version
pnpm expo config --type public
```

Return to root afterwards:

```bash
cd /root/projects/876
```

Do not globally install `expo-cli`.

---

# 9. SDK/template baseline to verify at scaffold time

As researched on 2026-09-16, the current stable Expo line is:

```text
Expo SDK 57
React Native 0.86.x
React 19.2.3 in Expo's SDK 57 monorepo example/template guidance
```

The 876 monorepo currently pins React `19.2.8` at the root.

This is a **known compatibility question, not permission to downgrade React**.

When the scaffold phase is authorized, record the actual generated versions from:

```bash
cat apps/projects-mobile/package.json
pnpm --filter @876/projects-mobile list expo react react-native
```

Then run Expo Doctor from the mobile app directory:

```bash
cd /root/projects/876/apps/projects-mobile
pnpm dlx expo-doctor
```

Also check dependency alignment with Expo:

```bash
pnpm expo install --check
```

If Expo recommends fixes, do not apply broad root/workspace changes automatically. First determine whether the issue is app-local, duplicated native modules, or a root override/resolution interaction.

Official references:

```text
https://docs.expo.dev/guides/monorepos/
https://docs.expo.dev/develop/tools/
```

---

# 10. Verify EAS CLI and Expo account access

For this project, the recommended remote-server/physical-phone workflow uses **EAS cloud development builds**, so the Hetzner server does not need to compile Android locally.

Check whether EAS is installed globally:

```bash
command -v eas || true
eas --version || true
```

A global install is optional. The preferred no-repository-mutation path is to use the latest EAS CLI through pnpm:

```bash
pnpm dlx eas-cli@latest --version
```

Check login state:

```bash
pnpm dlx eas-cli@latest whoami
```

If not authenticated:

```bash
pnpm dlx eas-cli@latest login
```

Alternatively, Expo's documented global install is:

```bash
pnpm add --global eas-cli
```

Use whichever method works on the host, but do not add `eas-cli` to the monorepo merely to obtain the command unless the implementation later has an explicit reason to pin it as a development dependency.

Do not run `eas init` or `eas build:configure` during this planning-only pass. Those belong to the authorized scaffold/build phase.

Official references:

```text
https://docs.expo.dev/build/setup/
https://docs.expo.dev/tutorial/eas/configure-development-build/
```

---

# 11. Default Android build strategy for this Hetzner workflow

## Preferred path: EAS cloud build

Use this by default:

```text
Hetzner/vscode.dev
  ├─ source code
  ├─ pnpm / Expo CLI
  ├─ Metro
  └─ Expo tunnel
        ↓
physical Android phone
  └─ installed Projects development APK
        ↓
production 876 APIs
```

This path means the server does **not** need:

```text
Android Studio
Android Emulator
Android SDK
Java/Gradle toolchain for local Android builds
USB-connected phone
ADB
```

Those are only required if the team deliberately chooses local native compilation with `pnpm expo run:android` or local EAS builds.

Expo documents EAS Build as requiring no native build tools on the development machine.

## If local Android compilation is intentionally chosen later

Only then verify/install:

```text
Java/JDK supported by current Expo/React Native tooling
Android Studio or command-line Android SDK
Android platform-tools / adb
Android SDK build tools and required platform
ANDROID_HOME / PATH configuration
```

Do not incur that setup cost preemptively on the 7 GB Hetzner host.

---

# 12. Physical Android phone checklist

The user will test on a real Android phone.

Before the first device session, verify the phone has:

- reliable internet access;
- a current system browser/Chrome for OAuth custom-tab/system-browser flows;
- enough free storage to install a development APK;
- permission to install the EAS development APK when sideloading is required;
- QR-code scanning capability;
- the future custom development build installed after EAS produces it.

USB debugging is **not required** for the default EAS-cloud + tunnel workflow.

Expo recommends real-device testing and recommends development builds rather than Expo Go for production-grade apps.

---

# 13. Development-build tools to install after the scaffold exists

Do not run these before `apps/projects-mobile` exists and the scaffold phase is authorized.

From the mobile app workspace, use Expo-aware installation so Expo selects SDK-compatible versions:

```bash
cd /root/projects/876/apps/projects-mobile

pnpm expo install expo-dev-client
pnpm expo install expo-auth-session expo-crypto
pnpm expo install expo-web-browser
pnpm expo install expo-secure-store
```

Expo AuthSession requires `expo-crypto` as a peer dependency.

Do not manually guess package versions when `expo install` can select the supported SDK versions.

Other planned dependencies, such as TanStack Query, should be added only in the phase that needs them and should be checked against current React Native support before installation.

After native dependency changes:

```bash
pnpm dlx expo-doctor
pnpm expo install --check
```

Official references:

```text
https://docs.expo.dev/develop/development-builds/introduction/
https://docs.expo.dev/versions/latest/sdk/auth-session/
https://docs.expo.dev/versions/latest/sdk/webbrowser/
https://docs.expo.dev/develop/user-interface/store-data/
```

---

# 14. Do not use Expo Go as the acceptance environment

Expo Go can be useful for very early compatibility smoke tests, but it is not the acceptance target.

The actual development environment must become a custom development build with:

```text
expo-dev-client
custom app scheme/deep linking
876 OAuth redirect
SecureStore-backed token persistence
any required native config plugins
```

Expo's current guidance calls Expo Go a learning/playground environment and development builds the intended environment for production projects.

---

# 15. EAS project setup — later phase only

After the app scaffold exists and the user authorizes build setup:

```bash
cd /root/projects/876/apps/projects-mobile
pnpm dlx eas-cli@latest whoami
pnpm dlx eas-cli@latest init
pnpm dlx eas-cli@latest build:configure
```

The intended `eas.json` profiles are:

```text
development
preview
production
```

Development must produce an installable Android development client/APK. Expo's Android development-build guidance requires the development client profile and an APK suitable for device/emulator installation.

Do not start an EAS build merely because configuration succeeded. Follow the phase plan and user authorization.

Typical later command:

```bash
pnpm dlx eas-cli@latest build --platform android --profile development
```

---

# 16. Metro/tunnel verification — after scaffold/build only

Because development happens on Hetzner and the phone is remote, tunnel mode is the default first connectivity test:

```bash
cd /root/projects/876/apps/projects-mobile
pnpm expo start --tunnel
```

Expo documents `--tunnel` as the fallback when the device cannot directly reach the development server over local networking.

Do not pre-install random tunneling packages. Let current Expo tooling report any tunnel dependency it actually needs.

Important distinction:

```text
Expo tunnel = phone <-> Metro development bundle transport
Projects API = phone -> https://876-projects-api.vercel.app
Core/OAuth API = phone -> verified production Core/OAuth origin
```

The API traffic must never be routed through the Hetzner Metro server merely because the JS bundle is.

---

# 17. Network reachability checks

Before blaming Expo, verify basic outbound HTTPS/DNS from Hetzner:

```bash
curl --version
curl -sS -o /dev/null -w "npm registry: %{http_code}\n" https://registry.npmjs.org/expo
curl -sS -o /dev/null -w "expo.dev: %{http_code}\n" https://expo.dev
curl -sS -o /dev/null -w "Projects API origin: %{http_code}\n" https://876-projects-api.vercel.app
```

The Projects root may legitimately return a non-200 application status. This check is for DNS/TLS/HTTP reachability, not API health semantics.

The Core/OAuth production origin must be established during Phase 0 from repository/deployment truth before adding a similar check for it.

---

# 18. Expo Router/auth prerequisites to record for implementation

The scaffold should use Expo Router.

Current Expo Router guidance supports protected route groups using `Stack.Protected` / navigator protected routes for authenticated navigation state. This is a **client navigation guard only**, not backend authorization.

For native 876 OAuth, planned Expo libraries are:

```text
expo-auth-session
expo-crypto
expo-web-browser
expo-secure-store
```

Implementation must later verify:

- custom URI scheme;
- `AuthSession.makeRedirectUri()` result;
- PKCE enabled;
- OAuth state validation;
- system browser completion behavior;
- refresh-token rotation;
- SecureStore persistence;
- backend Projects session authorization.

Official references:

```text
https://docs.expo.dev/router/advanced/authentication/
https://docs.expo.dev/router/advanced/protected/
https://docs.expo.dev/guides/authentication/
```

---

# 19. Monorepo-specific checks after scaffold

Expo has first-class pnpm workspace support and automatic Metro monorepo configuration when using `expo/metro-config`.

The 876 root already contains:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

After scaffold, verify:

```bash
pnpm install --frozen-lockfile=false
```

Only during the authorized scaffold phase, because the new workspace necessarily changes the lockfile.

Then inspect:

```bash
git status --short
pnpm --filter @876/projects-mobile list --depth 0
```

Do not add legacy Metro monorepo hacks unless a measured failure requires them:

```text
watchFolders
resolver.nodeModulesPath
resolver.extraNodeModules
resolver.disableHierarchicalLookup
```

Run once after scaffold if Metro behavior suggests stale config/cache:

```bash
cd apps/projects-mobile
pnpm expo start --clear
```

---

# 20. Expo Doctor is a required gate, not optional advice

After the app exists, run from the app directory:

```bash
pnpm dlx expo-doctor
```

Expo Doctor checks common app configuration/dependency issues and can report duplicated native modules in monorepos.

Also run:

```bash
pnpm expo install --check
```

Do not suppress Doctor warnings by adding exclusions until the agent understands the underlying conflict.

A warning about a package or React version must be investigated before changing repository-wide dependency policy.

---

# 21. What must NOT be installed or configured during preflight

Unless a later authorized phase proves it is needed, do not install/configure:

```text
global legacy expo-cli
Android Studio on Hetzner
Android Emulator on Hetzner
ADB on Hetzner
Java/Gradle solely for EAS cloud builds
Redux
NativeWind
custom Metro monorepo aliases
an alternate package manager
an Expo/EAS secret containing a server credential
ngrok/cloudflared manually for Metro without Expo asking for it
```

Do not add packages merely because they are common in React Native apps.

---

# 22. Preflight evidence to record

When the user authorizes local work, the local AI should record this table in the Phase 0 reconnaissance report before implementation:

| Check | Detected value | Required/expected | Action |
| --- | --- | --- | --- |
| Branch | | `feature/projects-mobile` or authorized phase branch | |
| Working tree | | understood/clean | |
| Node | | LTS, repo `>=22.13` | |
| pnpm | | `11.3.0` preferred for parity | |
| Git | | working | |
| GitHub CLI/auth | | authenticated | |
| Codex | | working | |
| Muse probe | | returns `OK` | |
| create-expo-app reachability | | working | |
| Existing global `expo` | | informational only | |
| EAS CLI | | reachable | |
| Expo account | | authenticated before EAS setup | |
| npm registry reachability | | reachable | |
| expo.dev reachability | | reachable | |
| Projects production origin | | reachable | |
| Host RAM/disk | | enough for run; avoid parallel heavy tasks | |
| Android strategy | | EAS cloud build + physical phone | |
| Android Studio/ADB needed now | | **No** | |

If something is missing, record exactly what was installed or changed to satisfy it.

---

# 23. Stop conditions during setup

Stop and report instead of improvising if:

- the local Node version cannot satisfy both current Expo and repository requirements;
- pnpm install rewrites the lockfile during a supposedly frozen preflight;
- Muse profile authentication/configuration is broken;
- GitHub credentials cannot safely push the feature branch;
- Expo/EAS authentication cannot be established;
- the server cannot reach npm/Expo services;
- the only proposed fix is a broad root React downgrade before the Expo app exists;
- the agent is about to put a server secret into Expo/EAS/mobile configuration;
- another agent/user has uncommitted work whose ownership is unclear.

---

# 24. First local command block to run after authorization

The local Muse/Codex driver should begin with this exact **verification-only** block before Phase 0 repository reconnaissance:

```bash
cd /root/projects/876

git fetch origin
git checkout feature/projects-mobile
git pull --ff-only origin feature/projects-mobile

echo '--- git ---'
git status --short
git branch --show-current
git log -1 --oneline
git --version
gh --version
gh auth status

echo '--- host ---'
uname -a
free -h
df -h .

echo '--- node/pnpm ---'
node --version
pnpm --version

echo '--- codex/muse ---'
codex --version
codex exec -p muse --dangerously-bypass-approvals-and-sandbox \
  "Reply with exactly OK" < /dev/null

echo '--- expo/eas availability ---'
command -v expo || true
expo --version || true
pnpm create expo-app --help >/dev/null
pnpm dlx eas-cli@latest --version
pnpm dlx eas-cli@latest whoami || true

echo '--- network ---'
curl -sS -o /dev/null -w "npm registry: %{http_code}\n" https://registry.npmjs.org/expo
curl -sS -o /dev/null -w "expo.dev: %{http_code}\n" https://expo.dev
curl -sS -o /dev/null -w "Projects API origin: %{http_code}\n" https://876-projects-api.vercel.app
```

This block must **not** create `apps/projects-mobile`, modify packages, initialize EAS, or start implementation.

After it completes, continue with Phase 0 from `local-muse-codex-plan.md` and record the observed values in the reconnaissance report.
