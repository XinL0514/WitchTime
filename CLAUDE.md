# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

WitchTime is an AI-driven Android UI end-to-end testing framework built on [Midscene.js](https://midscenejs.com/)'s Android support (`@midscene/android`, adb-based) + [Vitest](https://vitest.dev/). It's the Android sibling of a Web framework called Ultrahand (Midscene + Playwright) — same idea (natural-language `aiAct`/`aiQuery`/`aiAssert` instead of selector-based automation), different platform and test runner.

The target app under test is 神笔马良's Android client, with test coverage mirroring Ultrahand's web suite: login, course list, and the in-classroom AI panel's text-to-image / image-to-image flows.

## Commands

```bash
npm install

npm test                                                  # run full suite (vitest run)
npm run test:watch                                         # watch mode

npx vitest run e2e/testcase/basic/login.spec.ts           # run a single file
npx vitest run -t "可以文生图"                              # run a single test by name
```

Setup before running tests:
- `adb devices` must show at least one device in `device` state (not `unauthorized`/`offline`) — USB debugging on, device authorized.
- `cp .env.example .env`, then fill in: one vision-model provider (`MIDSCENE_MODEL_*`, Gemini or GPT-5 — **Midscene does not support Claude/Anthropic** as the vision-locating model), `MIABI_ANDROID_PACKAGE` (+ optionally `MIABI_ANDROID_LAUNCH_TARGET`), `MIABI_TEST_PHONE`/`MIABI_TEST_PASSWORD`, and optionally `ANDROID_DEVICE_ID` if more than one device is connected.

After a failure, check the Midscene HTML report first (path printed at the end of the run, defaults under `midscene_run/report/`) — it shows each step's screenshot and the AI's decision.

## Architecture

- `vitest.config.ts` — `@e2e/*` alias, `fileParallelism: false` (specs share one physical device/account/classroom flow, not safe to run concurrently — same reasoning as Ultrahand's `fullyParallel: false`/`workers: 1`).
- `e2e/agent.ts`:
  - `createAgent(cacheId)` — connects via `agentFromAdbDevice(deviceId)` (deviceId from `getEnvironment()`, or auto-picks the first connected device if unset), then `agent.launch(appLaunchTarget)`. `cache: true` is enabled with the given `cacheId`, scoping Midscene's plan/locate cache (`midscene_run/cache/<cacheId>.cache.yaml`) per spec so unrelated specs don't share/clobber each other's cached prompts — pass a name unique per spec (mirrors Ultrahand's `cache: true` on its Playwright fixture). One agent per spec file: create in `beforeAll`, `agent.destroy()` in `afterAll`. Note: `AndroidAgent.terminate(pkg)` force-stops an app by package name — it is not the session teardown method.
  - `ensureLoggedIn(agent, account)` — checks login state via `aiBoolean` first (no Playwright `storageState`-equivalent for native apps; the app's own on-device session persists across runs as long as app data isn't cleared), only runs the login flow if not already logged in.
- `e2e/testdata/` — same shape as Ultrahand's, env-var driven:
  - `environments.ts` — `getEnvironment()` → `{ deviceId?, appPackage, appLaunchTarget }`. Throws if `MIABI_ANDROID_PACKAGE` is unset.
  - `accounts.ts` — `getTestAccount(role?)` → `{ phone, password }`, identical to Ultrahand's (env-var driven, `_<ROLE>`-suffixed variants, throws if unset).
  - `testdata/scenarios/classroom.ts` — plain business test-case data (image-gen prompts), copied from Ultrahand since it's the same underlying business flows.
- Path alias `@e2e/*` → `./e2e/*` (see `tsconfig.json` and `vitest.config.ts`'s `resolve.alias`).
- `e2e/testcase/` — specs grouped by business domain, same split as Ultrahand:
  - `basic/` — flows that don't require entering a classroom (`login.spec.ts`).
  - `classroom/` — flows that first enter a classroom (`courses.spec.ts`, `texttopictureBDT.spec.ts`, `picturetopictureBDT.spec.ts`).

### No Playwright fixture — Vitest lifecycle pattern instead

Midscene has no official Playwright integration for Android (`PlaywrightAiFixture` is web-only). Every spec file follows the official Midscene Android example pattern: build the `AndroidAgent` in `beforeAll`, run assertions in `it()` blocks, `destroy()` in `afterAll`. There's no Playwright-style fixture injection (`test.extend`) — helpers like `createAgent`/`ensureLoggedIn` are plain functions called explicitly, not injected fixtures.

### Classroom AI-panel spec pattern

Same natural-language phrasing style as Ultrahand's web specs (copied over, since the underlying app is the same product): a detailed `aiWaitFor` description of the target state (e.g. "the image has finished rendering, no longer showing queued/generating/progress-percentage"), then a similarly-worded `aiAssert`. If Android's actual screen copy/flow differs from what's in the current specs, adjust wording — don't change the pattern.

`picturetopictureBDT.spec.ts` chains two AI actions (text-to-image, then image-to-image off the first result) rather than testing them independently — same structure as Ultrahand's version.

### Known constraints

- Midscene does not support Anthropic/Claude as a vision-locating model — this project uses Gemini or GPT-5.
- `aiHover` is not available on Android (web/desktop only) — don't use it in specs here.
- Non-ASCII/IME text input may need `imeStrategy: 'always-yadb'`; `FLAG_SECURE` screens may screenshot black and need `screenshotStrategy: 'always-yadb'` (success is device/ROM/root-dependent).
- Login flow / classroom navigation copy and tap targets are only known from a real run on the actual device. If a spec starts failing, first adjust the natural-language steps in `e2e/agent.ts` / the spec itself, not the underlying architecture — same principle as Ultrahand's `global-setup.ts` note.
