---
name: dsh-prose-standard
description: Write or review Harnova documentation, comments, diagnostics, and visible text while preserving behavior, conditions, and safe-use facts.
---

# Harnova prose standard

Write clear, factual prose for the requested scope. Review tasks report findings; authorized editing tasks apply changes. Follow [documentation instructions](../../../docs/AGENTS.md) and [dsh-doc](../dsh-doc/SKILL.md) for placement and verification.

## Preserve meaning

Keep the actor, action, conditions, exceptions, ordering, ownership, failures, side effects, and compatibility facts. Shorter text is useful only when those facts survive. Explain non-obvious behavior where a caller or maintainer needs it; link long rationale to its owner.

## Remove unnecessary text

Remove repetition, code restatement, implementation walkthroughs, review-session narration, and references to uncommitted drafts. Keep meaningful historical evidence in decision records and postmortems. Use concrete terms when clearer; there are no blanket word bans or fixed word counts.

## Edit the owner

Update code comments or the owning document before generated catalogs and expected outputs. Leave `vendor/` to its synchronization procedure. Preserve historical design decisions and product fixtures. Mark links to removed development infrastructure as historical references.

Model prompts and product text are behavior: change the owning source and relevant snapshots. UI copy remains in typed locale dictionaries, including accessibility labels. Japanese or English prose does not require a Chinese counterpart or hash sidecar.

## Validate

Run checks relevant to the edited content and behavior. Check the complete diff for lost conditions or guarantees. Report changes, deliberate keeps, verification results, and any remaining uncertainty.
