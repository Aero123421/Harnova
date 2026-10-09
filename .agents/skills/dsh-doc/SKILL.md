---
name: dsh-doc
description: Create, revise, or review Harnova documentation, package READMEs, and documentation-site sources with accurate usage and relevant validation.
---

# Harnova documentation

Follow [root instructions](../../../AGENTS.md) and [documentation instructions](../../../docs/AGENTS.md). Use [dsh-prose-standard](../dsh-prose-standard/SKILL.md) for prose judgment. These workflows guide the task; they do not impose a fixed chapter order or word budget.

## Workflow

1. Read the target page and its owning code, tests, and navigation. Check behavior against the current checkout and the actual review base, rather than a fixed remote branch.
2. Put package usage and configuration beside the package; architecture and cross-package guides belong under `docs/`. Write for the reader's task, including prerequisites, success, likely failures, and limitations.
3. Update source before generated catalogs. Preserve existing generated regions and source-equivalent type fences; regenerate their derivatives with the owning generator.
4. Use Japanese or English as needed. No Chinese counterpart, translation sidecar, line alignment, or re-recording is required.
5. Run relevant documentation checks. Use `pnpm run test:docs` for quick checks and `pnpm run doc-sync` when generated references, code examples, or the site are affected. Report commands actually run and any verification limits.

## Voice rules

State observable behavior and exact instructions. Keep facts that affect safe use, failures, ownership, timing, or compatibility. Remove duplicated explanations and implementation narration. An untested command must not be described as verified; do not run destructive or externally publishing instructions just to validate prose.

## Templates

Existing metadata kinds and templates remain available for documentation consumed by repository tools: [package-group](templates/package-group.md), [package-reference](templates/package-reference.md), [package-library](templates/package-library.md), [package-bundle](templates/package-bundle.md), [persistence-change](templates/persistence-change.md), [persistence-release](templates/persistence-release.md), [persistence-format](templates/persistence-format.md), and [upgrade-guide](templates/upgrade-guide.md). Keep machine-parsed metadata accurate; adapt the surrounding prose to the reader.

## Website publication

Canonical Markdown remains outside `website/`. [website/docs.ts](../../../website/docs.ts) maps selected sources to routes; the projector creates ignored build output. Update manifest entries and current inbound links when moving a published page. Do not edit generated website output. Publication is a separate action requested by the user.
