---
name: dsh-create-upgrade-guide
description: Document externally observable Harnova breaking changes to CLI, profiles, settings, saved data, SDKs, wire APIs, or published entry points.
---

# Harnova upgrade guides

Write or update an upgrade guide in the change that introduces a break users can observe. Internal APIs updated with all repository consumers need no separate guide. Session format changes still follow [type acknowledgements](../../../docs/cookbook/reviewing-persistence-type-changes.md).

Use `docs/upgrade-guide/v<root-package-version>/<item>/guide.md`, where the directory names the release users upgrade from. Update an existing guide for the same unreleased change; remove it if the break is reverted. Older release guides retain their historical migration instructions.

Use the [template](../dsh-doc/templates/upgrade-guide.md). Keep machine-parsed `kind: upgrade-guide`, `description`, and the `Change` / `Migration` sections. State the affected users, old and new behavior, exact files or commands to change, and how to confirm success. Japanese or English body text is allowed; no Chinese sibling or sidecar is required.

Use enough detail for a safe upgrade. Link compatibility rationale and code rather than repeating large inventories. Run `pnpm run verify-upgrade-guides` and the relevant documentation checks. Do not claim unrun migration commands were verified.
