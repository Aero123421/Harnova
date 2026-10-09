---
description: "Harnova sidebar brand artwork for release-profile builds, retaining the existing package name."
kind: package-reference
---

# @deepseek-ai/dsh-client-ui-brand-official

This package occupies `sidebar.brand.mark` and `sidebar.brand.name` with the approved Harnova mark and outlined wordmark when `DSH_CLIENT_BUILD_PROFILE` is `official`. The existing package name and build-profile selector remain compatible. Other builds use the sidebar's Harnova mark and localized local-build label. The conversation hero uses the same static Harnova mark through its owning package's fallback.

The host entry is inert. The browser entry waits for the two sidebar declarations with nested `ctx.slots.inject()` calls and withdraws both occupants when their owner or plugin is disposed. It has no runtime state and does not change model requests.

A deployment with its own identity can replace the sidebar slots and `conversation.hero.brand.mark`. Document titles belong to `DSH_CLIENT_TITLE`, outside the slots. Artwork paths are generated from the approved SVGs by `pnpm branding:generate`; see [branding assets](../../../assets/branding/README.md).

See [sidebar](../ui-sidebar/README.md), [conversation](../ui-conversation/README.md), and [Web Client slots](../../../docs/subsystems/slots.md).
