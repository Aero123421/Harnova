# Template: package-library

Use this template for a package with no plugin surface: its entry exports a plain module API and it registers nothing into a composition. Examples: `boot/app-boot`, `util/*`, `sdk/protocol`, `typert/generator`. The `boot/app-boot` README is the worked example.

A library README differs from a package reference in three ways: no "install into a profile" guidance (a library is a dependency, not a layer), no mount configuration (there is no `cordis.yml` row), and a brief explanation of model effects only when relevant (most libraries have none or contribute indirectly).

## Frontmatter

```yaml
---
description: "What the library lets a caller build, in one or two concrete sentences with the consuming packages or searchable domain terms."
kind: "package-library"
---
```

## Skeleton

```markdown
# @deepseek-ai/dsh-<name>

## Summary

A concise explanation: what a caller can DO with the library, who consumes it, the smallest entry point, and the main boundary. Apply the [Summary voice rules](../SKILL.md#voice-rules).

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

### When to use it

Name the consuming call sites (which bins, packages, or runtimes import it) and when a caller should reach for it instead of a plugin.

### Entry point

The smallest import-plus-call that works, in a `text` or `ts` fence, followed by what success and failure look like. Link the owning contracts in `src/index.ts` for exact detail instead of restating them.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

Design notes and a source-map table. No API catalogs.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Adjacent pages, closest prerequisite first.

-----

<a id="model-experience"></a>
## Model Experience

Explain meaningful direct or indirect model effects when relevant. A library never invents model effects it does not have.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

Current package constraints, if present. Omit this section when it adds no useful information.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
```

## Rules

- **Classify by the entry, not the folder.** Read `src/index.ts` before choosing this template: `export default` a service class or an `apply` export makes the package a `package-reference`, and `dsh.bundle.patch` in `package.json` makes it a `package-bundle`. A plain module API without those is a library.
- **Never write profile-install guidance.** `dsh plugin --profile <name> add <package>` installs any npm dependency but activates a profile layer only for `dsh.bundle`-declaring packages; for a library it is at best a no-op dependency and must not appear as an install path.
