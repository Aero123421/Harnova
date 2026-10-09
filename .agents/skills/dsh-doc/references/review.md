# Review criteria

## Newcomer test

Can the reader find prerequisites, a working entry path, successful outcome, and likely failure recovery?

## Evidence review

Compare configuration, defaults, failure handling, and limitations with the owning code and tests. Distinguish observed execution from unverified instructions.

## Package README review

Identify whether the package is a library, plugin, or bundle. Describe its real consumer entry and configuration, model-visible effects when present, and current limitations. Do not invent an install path for a plain library.

## Reference example

The [session-persistence-jsonl README](../../../../packages/session/session-persistence-jsonl/README.md) illustrates usage and persistence constraints; adapt the format rather than copying every section.

## Verification

Run relevant documentation checks and behavior evidence. Report actual commands and limitations; do not claim a command was run from a static reading alone.
