# Harnova

Harnova is an independent open-source AI agent project based on [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), developed by [DeepSeek AI](https://deepseek.com). This checkout retains the upstream runtime, package names, and `dsh` command.

It is built on an **everything-is-a-plugin** architecture and powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512).

Upstream documentation: [https://deepseek-harness.github.io/deepseek-harness/](https://deepseek-harness.github.io/deepseek-harness/)

## Planned features

Harnova-specific capabilities are development goals, not completed features:

- Japanese UI and Japanese agent interaction as standard features.
- Security Mode for source auditing, dependency checks, and authorized security diagnostics.
- SSH remote workspaces for file operations and command execution on a selected host.
- Native Desktop distribution for Windows, macOS, and Linux. The upstream Desktop currently supports Windows and macOS releases; Linux packaging requires additional work.

Security Mode selects agent capabilities; SSH selects the execution environment. They remain independent. Extensions use plugin APIs where possible so upstream updates remain manageable. Before distributing Harnova, its application IDs, signing, update endpoints, and branding must be independent of the upstream application.

## Development and distribution

Harnova uses standard GitHub Actions runners for Linux, Windows, and macOS. Pull requests and changes to `main` run checks without provider API keys; live-provider E2E runs are started manually. Package builds also verify installation from local tarballs.

Distribution uses [Harnova GitHub Releases](https://github.com/Aero123421/Harnova/releases). The manual release workflow prepares a draft with developer package archives. These archives retain the current upstream package names and use Harnova branding. Desktop installers require independent application identity, signing, update endpoints, and Linux packaging before they can be distributed.

Development instructions are in [AGENTS.md](AGENTS.md). Chinese documentation copies and translation bookkeeping are removed; English reference documentation remains. Browser GIF recording is optional, using [record-browser-gif](.agents/skills/record-browser-gif/SKILL.md). Product UI locale dictionaries are separate from documentation.

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/Aero123421/Harnova.git
cd Harnova
pnpm install
pnpm run build
pnpm harnova web
```

Harnova starts the Web UI at `http://127.0.0.1:3081` by default; use `--no-open` to suppress browser launch. Its user data lives in `~/.harnova`, or the explicit `HARNOVA_HOME` directory. Inherited `DSH_HOME` and existing `~/.dsh` data are ignored. See the [coexistence audit](docs/harnova-coexistence-audit.md).

`pnpm run build` prepares the repository artifacts. `pnpm harnova web` uses those built artifacts without rebuilding.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

`pnpm run dev:web` builds, serves, and rebuilds client bundles on source edits in one terminal, and `make help` lists the matching Make targets for Web and Desktop; the guide's application commands section owns the full table.

For agents, follow [AGENTS.md](AGENTS.md).

## Citation

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
