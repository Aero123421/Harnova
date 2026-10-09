---
kind: upgrade-guide
description: "Harnova artwork and Desktop distribution names replace upstream branding."
---

# Harnova branding

## Change

Web and Desktop builds use the approved Harnova mark, wordmark, title, icons, and onboarding illustrations. The existing `official` client build selector now identifies Harnova release artwork. Desktop product names and artifact filename prefixes change to Harnova and `harnova-`; packager, upload-plan and installed-update filename handling follow those names.

`HarnovaMark` is the preferred primitive. `FishLogo` remains a deprecated import alias, but draws the Harnova mark at a square ratio. The legacy `FISH_LOGO_PATH` and `FISH_LOGO_VIEWBOX` now describe the Harnova shape in its 256-unit source viewport. `BrandWordmark` keeps its props and renders Harnova. The running icon becomes a vector opacity pulse, static with reduced motion or forced colors.

## Migration

- Plugins should import `HarnovaMark` from `@deepseek-ai/dsh-client-ui-primitives` and review layouts that assumed FishLogo's old wide ratio. Prefer the component over copying path constants.
- Release automation matching `DeepSeek Harness.app`, `DeepSeek Harness.exe`, or `deepseek-harness-*.exe/dmg/zip` must use the Harnova names. Rebuild complete client artifacts when changing the release profile; the build record binds the title and bundled artwork to those artifacts.
- Run `pnpm branding:generate` after changing the approved SVG source. Confirm `pnpm branding:check` and review 14/16/24px sizes in both themes.

The `dsh` protocol, package names, configured application IDs, stored Session formats and account-provider identifiers retain their existing contracts. Independent signing and update endpoints are still required before distributing Harnova Desktop; this artwork change does not configure those services. Harnova installers have their own product name; this change does not implement migration from an installed upstream product.
