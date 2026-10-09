# Contributing to Harnova

Harnova is an independent project based on DeepSeek Harness. Open a pull request against `main` in [Aero123421/Harnova](https://github.com/Aero123421/Harnova). Upstream changes are fetched separately; Harnova contributions do not require approval from upstream maintainers.

Start with [development](docs/development.md), [architecture](docs/architecture.md), and [testing](docs/testing.md). Keep changes focused, use existing plugin interfaces, and run checks relevant to the change. Record the commands and results in the pull request. Commits and pull request descriptions use Japanese; reference documentation can use English or Japanese without a Chinese translation requirement.

Use GitHub-hosted Actions for CI. Live-provider tests and browser recordings are optional when they help verify a specific change. Local hooks can be enabled with `pnpm run prepare:hooks`.

The [MIT license](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md) apply to contributions and distributions.
