# AGENTS.md — Experimental packages

These rules supplement the [package rules](../AGENTS.md). The [experimental publication reference](README.md) owns the publication policy; the rules below define dependency isolation and promotion.

- A package belongs here only when its complete public contract is experimental or internal-only. An experimental option inside a release package stays with its owning product role.
- Preserve the existing `@deepseek-ai/dsh-experimental-*` names and manifest visibility expected by [the package policy](../../scripts/experimental-package-policy.ts). These metadata describe package compatibility, not an instruction to publish under the upstream npm organization. Harnova app distribution uses its GitHub Releases.
- Release packages and apps outside this group must not name experimental packages in `dependencies`, `optionalDependencies`, or `peerDependencies`. [Default-product isolation](../../.agents/notes/implemented/process/2026-09-12-default-product-experimental-isolation.md) also checks transitive installations, runtime imports, and shipped compositions in CI. Experimental packages may depend on release packages and each other. Tests may use experimental packages through `devDependencies`; examples may load them explicitly.
- Experimental status does not relax engineering, security, documentation, lifecycle, testing, or snapshot requirements.
- Publishing an experimental package does not promote it or add a stability promise. Promotion moves a package to its product-role group and removes `experimental-` from its npm name; update every import and configuration row atomically, then review its public contract, limitations, test evidence, release payload, runtime dependents, and named stable owner.
