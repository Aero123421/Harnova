---
description: "Records a persistence type transition and its compatibility acknowledgement."
kind: persistence-change
---

# 2026-10-10-model-speed

## Summary

Add an optional standard/fast speed choice to model selections and assembled request headers, independent of reasoning effort.

## Table of Contents

- [Declaration](#declaration)
- [Compatibility](#compatibility)
- [Verification](#verification)
- [Dev Note](#dev-note)

<a id="declaration"></a>
## Declaration

```yaml persistence-change
schemaVersion: 1
id: 2026-10-10-model-speed
baseline: false
changes:
  - root: "event:model/selection"
    previous: "2026-09-11-initial"
    after: "223bbd4af26f2ec8a42a9c03df8907daa270d1b0d0ba3d22c73a7a6c734dc25c"
    decision: same-version
  - root: "event:request/header"
    previous: "2026-09-16-session-format-v4"
    after: "936146a267a68a9daecea732783c588416fd588efdac79b8c8bf595ebea46fe2"
    decision: same-version
```

<a id="compatibility"></a>
## Compatibility

Both changes add an optional enum-valued property. Existing records without speed keep provider-default dispatch. Current writer/readers remain Session V4; no format generation or session migration is needed. Selection projection stateVersion advances to 3 so old cached projections are rebuilt from the durable log. Unsupported model capabilities reject an explicit speed before communication.

<a id="verification"></a>
## Verification

pnpm exec vitest run packages/core/agent-loop/tests/request-reconstruction.spec.ts packages/core/agent-default-model/tests packages/llm/model-access/tests packages/subagent/subagent/tests packages/subagent/subagent-spawn-in-process/tests packages/subagent/subagent-fork-in-process/tests passed 388 tests. The reconstruction test records fast then standard in request/header while preserving the model input prefix and reasoning effort. packages/llm/llm-pi-ai/tests/speed.spec.ts passed in the owning adapter suite: mocked fetch observed priority, default, and absent service_tier with equal remaining payload fields. No live account test was performed.

<a id="dev-note"></a>
## Dev Note

None.
