---
kind: package-library
description: "Legacy persisted event types retained for reading existing sessions."
---

# @deepseek-ai/dsh-session-log-deepseek

This package retains the historical event vocabulary in [types.ts](src/types.ts) so existing Session logs and migrations remain readable. It provides no feedback command, Remote service, collection, or upload implementation. Its entry exports types only and must not be mounted as a Cordis plugin.

See the [upgrade guide](../../../docs/upgrade-guide/v0.2.1-alpha.1/feedback-and-telemetry-removal/guide.md) for removed profile rows and SDK entries. The Session format is unchanged.
