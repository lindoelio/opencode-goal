# AGENTS.md

OpenCode plugin: `/goal` command with autonomous worker→judge loop. Source files (commands/agents/skills markdown) ARE the behavior — they get copied into `~/.config/opencode/` on install. Tests assert on their contents, so editing docs and tests must move together.

## Commands

- `npm test` — runs `vitest run` (5 test files in `tests/`)
- `npm run test:watch` — vitest watch
- `npm run test:coverage` — v8 coverage; **threshold is 100% on `lib.js` only**
- `node install.js` — local install (also the `opencode-goal` bin entry); copies `commands|agents|skills` to `~/.config/opencode/` and merges `goal-worker`/`goal-judge` into `opencode.json`
- `./install.sh` — **files only**, does NOT touch `opencode.json`. Use `install.js` for the full install.

No lint, no formatter, no typecheck. CI via GitHub Actions (`.github/workflows/publish.yml`) runs tests + coverage on tag push and publishes to npm.

## Layout

- `commands/goal.md` — command entry. Body is literally `{{args}}`; all logic lives in the agent.
- `agents/goal-worker.agent.md` — `mode: primary`. Full intent parser (STATUS/CLEAR/PAUSE/RESUME/SET) and work loop (Plan→Act→Checkpoint→Evaluate→Decide). Invokes the judge via the `task` tool.
- `agents/goal-judge.agent.md` — `mode: subagent`. Returns ONLY strict JSON: `{"met": boolean, "reason": string}`. `reason` max 120 chars. No markdown, no preamble.
- `skills/goal-loop/SKILL.md` — the iterate-evaluate-continue pattern as a reusable skill.
- `lib.js` — pure helpers (`ensureDir`, `copyDirRecursive`, `readJSONConfig`, `mergeAgentConfig`, `isSameAgentDef`). ESM (`"type": "module"` in package.json).
- `install.js` — installer; references `goalAgentConfig` with the default judge model. To change the default, edit it here AND in the test fixture (`tests/install.test.ts:19`).
- `.opencode/goal.md` — **runtime state file in the user's project, not in this repo**. 6 frontmatter fields: `condition`, `status` (`active|paused|achieved|cleared`), `iterations`, `started_at`, `last_verdict`, `max_iterations` (0 = unlimited).

## Gotchas

- **Tag-based publishing.** Push a `v*` tag to trigger the GitHub Actions workflow that publishes to npm (`.github/workflows/publish.yml`). The workflow runs tests + coverage before publishing. If the version is already on npm, the publish step is skipped.
- **Default judge model is `ollama-cloud/deepseek-v4-flash`** (see `install.js:67`), not an Anthropic model. README's `gpt-4o-mini` is just an example. `mergeAgentConfig` preserves whatever model the user already has, so re-running `install.js` won't overwrite a custom judge.
- **Judge contract is hard.** `met: true` is only for fully-satisfied conditions; `reason` is capped at 120 chars and must be actionable. The worker uses `reason` to guide the next iteration.
- **No-progress fall-back:** 3+ iterations with identical `reason` → worker stops and asks the user. Don't fight the loop; the constraint is in `goal-worker.agent.md`.
- **Tests read markdown.** `tests/structure.test.ts` and `tests/integration.test.ts` parse frontmatter and assert exact section names/strings. Renaming a heading or removing "PLAN"/"ACT"/etc. breaks CI.
- **Module type is ESM.** Use `import`/`export`, not `require`. All helper files use `import` syntax.
- **Coverage ignores markdown and tests.** Only `lib.js` is in the `coverage.include` glob — touching coverage requires adding tests that import the new function from `lib.js`.

## Adding a new helper

1. Add the function to `lib.js` (export it).
2. Add tests in `tests/install.test.ts` that exercise every branch (the 100% threshold is enforced).
3. Run `npm run test:coverage` to confirm.
