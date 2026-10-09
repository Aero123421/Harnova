---
kind: package-group
description: "Historical feedback event types retained for existing Session logs."
---

# feedback/ — legacy event vocabulary

Harnova has removed feedback collection, UI, commands, and Remote APIs. These packages retain historical persisted types so existing Session logs remain readable.

## Packages

| Package | Role |
|---|---|
| [command-feedback](command-feedback/README.md) | Historical `feedback/record` event and category types |
| [message-feedback](message-feedback/README.md) | Historical `feedback/message-put` and `feedback/message-delete` types |

See the [feedback subsystem](../../docs/subsystems/feedback.md) and [upgrade guide](../../docs/upgrade-guide/v0.2.1-alpha.1/feedback-and-telemetry-removal/guide.md).
