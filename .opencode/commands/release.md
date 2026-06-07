---
name: release
description: Prepare and publish opencode-goal-worker through the tag-triggered npm release pipeline
mode: primary
agent: build
---

Release this repository using the established `opencode-goal-worker` publication flow.

User request / target version:

{{args}}

## Goal

Prepare the requested package version, commit the release, create the matching `vX.Y.Z` tag, and push with tags so `.github/workflows/publish.yml` publishes to npm automatically.

Do not run `npm publish` manually. Publication is done by GitHub Actions after the tag push.

## Required Inputs

- Target version, for example `1.0.1`.
- If the target version is missing or ambiguous, ask one short clarification question before changing files.

## Successful Release Process

1. Inspect repository state.
   - Run `git status`.
   - Run `git diff --stat`.
   - Run `git log --oneline -10`.
   - Confirm the current branch and upstream state.
   - Never revert or overwrite unrelated user changes.

2. Commit feature changes first, if any are present.
   - Inspect the changed files enough to write an accurate commit message.
   - Ensure user-facing changes are documented in the README.
   - Stage the intended non-release files with `git add`.
   - Commit them with a concise conventional message, for example `feat: add pause/resume goal commands`.

3. Run tests before version bump.
   - Run `npm test`.
   - Run `npm run test:coverage` (threshold is 100% on lib.js).
   - If tests or coverage fail, fix the issue before proceeding.

4. Determine the version bump.
   - Read `package.json` to get the current version.
   - Determine the semantic bump type (major, minor, patch) based on the changes.
   - Confirm the target version matches the intended bump.

5. Bump the version.
   - Update `version` in `package.json` to the target version.
   - Update `version` in `package-lock.json` to match (the `version` field at the top level, and `packages[""]`).

6. Validate after version bump.
   - Run `npm test` one more time on the bumped version.
   - Verify `package.json` and `package-lock.json` are consistent.

7. Commit the release bump.
   - Stage `package.json` and `package-lock.json`.
   - Commit with exactly `release: vX.Y.Z`, replacing `X.Y.Z` with the target version.

8. Tag the release.
   - Confirm there is no existing tag with `git tag --list vX.Y.Z`.
   - Create an annotated tag: `git tag -a vX.Y.Z -m "release vX.Y.Z"`.

9. Push to trigger publication.
   - Run `git push --follow-tags`.
   - Confirm the output pushed both the branch commit and the `vX.Y.Z` tag.
   - Tell the user that `.github/workflows/publish.yml` will build, test, check the published npm version, and publish `opencode-goal-worker@X.Y.Z` if it is not already published.
   - Provide a link to the GitHub Actions run: `https://github.com/lindoelio/opencode-goal/actions`

## Guardrails

- Do not skip the feature commit before the release commit when non-release changes exist.
- Do not tag before the version bump commit exists.
- Do not push a tag whose version does not match `package.json`.
- Do not use `git reset --hard`, `git checkout --`, or any destructive cleanup unless explicitly approved.
- Do not amend published commits unless explicitly asked.
- If GitHub rejects or warns about a protected branch rule but the push succeeds, report the warning and continue.
