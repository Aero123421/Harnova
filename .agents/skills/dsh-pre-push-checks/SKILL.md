---
name: dsh-pre-push-checks
description: Select and run checks relevant to a Harnova change before pushing or claiming validation, without repeating passing checks or requiring the full suite.
---

# Harnova pre-push checks

1. Confirm the checkout, branch, remote, and actual review base with Git. Inspect committed, staged, unstaged, and new files; use `pnpm --silent run change-scope --base <verified-base-ref>` when useful. Push only to Harnova's `origin` unless the user explicitly requests otherwise.
2. Select the smallest regression evidence for the change: owning unit/integration tests, keyless recorded-session replay for visible output, documentation checks for prose or catalogs, and build plus artifact smoke for public entries or build changes. Follow [testing policy](../../../docs/testing.md).
3. Real provider changes need relevant live-API evidence when credentials are available. Report keyless evidence separately from a skipped or unrun live test. Never print secrets.
4. Run selected checks once. Fix failures before pushing; do not lower assertions or hide uncovered affected behavior. Do not repeat a passing check merely because commit or push follows. The full suite is for a broad change, CI diagnosis, or explicit request.
5. Commit normally, inspect any staged fixer changes, and push so the configured hooks run. Verify the remote matches the intended local commit. For an existing PR, inspect CI and report pending checks as pending.

History rewrites use an exact `--force-with-lease` against the fetched remote value. Abort on remote movement. GitHub native stacks are optional; ordinary PRs are supported. Run relevant checks again only when a merge, rebase, or subsequent edit invalidates their earlier evidence.

Vitest filters follow `pnpm run <script>` directly; check the selected test count before claiming a focused run. Coverage selection must include affected source, rather than narrowing scope to conceal untested behavior.
