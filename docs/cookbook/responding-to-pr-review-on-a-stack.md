# Responding to review across dependent PRs

Review comments may concern several dependent PRs. GitHub native stacks are optional; ordinary PR branches can express the same dependency order.

## Ground rules

1. Confirm each PR's current head, actual base, and dependency order.
2. Fix an issue in the layer that introduced it, then propagate the correction to affected children. Use separate worktrees when editing layers concurrently.
3. Choose merge-forward or rebase deliberately. History rewrites use `--force-with-lease` against a freshly observed remote value and abort on remote movement.
4. Validate the changed behavior in each affected layer. A passing top-layer check does not establish that its base PR is independently valid.

## Resolve comments through the chain

Verify the finding against the owning code, apply the fix, and inspect each child's diff against its parent after propagation. Recheck heads, unresolved review threads, required approvals, mergeability, and CI after any rewritten push. Report pending checks as pending. Reply or merge only when those external actions are included in the user's request.

Use [pre-push checks](../../.agents/skills/dsh-pre-push-checks/SKILL.md) to select relevant evidence. Native stack support is not a prerequisite for working on or merging ordinary PRs.
