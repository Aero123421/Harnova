# Harnova

English | [中文](README.zh.md)

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

## Developer preview

DeepSeek Harness is in _developer preview_ and iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

Review the [safety notice](SAFETY.md) before running the project.

## Run

### Run upstream from `npm`

This command runs the upstream package, not a Harnova release. Install `Node.js`, then run:

```sh
npx @deepseek-ai/dsh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/Aero123421/Harnova.git
cd Harnova
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` prepares the repository artifacts. `pnpm dsh web` uses those built artifacts without rebuilding.

## Community and support

- Submit Harnova feedback or bug reports through [GitHub Issues](https://github.com/Aero123421/Harnova/issues).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/4MrtZUhpxg">DeepSeek Harness Discord community</a>.

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
