# Harnova

Harnovaは、[DeepSeek AI](https://deepseek.com)が開発した[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)を基にする、独立したオープンソースのAIエージェントです。上流のプラグイン実行基盤とパッケージ名を維持し、`harnova`コマンドと専用のデータフォルダを使います。

**すべてをプラグインで構成する**アーキテクチャを採用し、[Cordis](https://github.com/cordiverse/cordis)を使用しています。設計の解説は[_A Programming Paradigm for Spatiotemporal Composability_](https://arxiv.org/abs/2608.25512)を参照してください。

上流のドキュメント: [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/)

## 日本語対応

WebとDesktopの画面は、日本語・英語・中国語に標準対応しています。日本語パックの追加は不要です。OS・ブラウザが日本語なら日本語で起動し、対応する言語が見つからない場合も日本語を表示します。保存済みの言語設定がある場合は、その設定を優先します。

「設定 → 一般 → 言語」から表示言語を変更できます。Webのローカル接続とDesktopでは選択を保存し、再起動後も引き継ぎます。外部ホスト名で開いたWeb画面では、言語選択はそのページ内だけで有効です。

<a id="planned-features"></a>
## 開発予定

以下は開発目標であり、完成済みの機能ではありません。

- ソースコードの監査、依存関係の確認、許可されたセキュリティ診断を行うSecurity Mode。
- 選択したホスト上でファイル操作やコマンド実行を行うSSHリモートワークスペース。
- macOS・Linux向けのDesktopアプリ配布。

<a id="development-and-distribution"></a>
## 開発と配布

CIにはLinux・Windows・macOSの標準GitHub Actionsランナーを使用します。PRと`main`の変更では、プロバイダーのAPIキーなしで検査を実行します。実際のプロバイダーを使うE2Eテストは手動で開始します。パッケージのビルドでは、ローカルのアーカイブからのインストールも検証します。

配布先は[HarnovaのGitHub Releases](https://github.com/Aero123421/Harnova/releases)です。手動のリリースワークフローで、Windows x64の署名なしインストーラーと開発者向けパッケージを含む下書きを作成します。アーカイブでは既存の上流パッケージ名を維持し、Harnovaのブランドを使用します。開発者向けネイティブパッケージはLinux x64用です。macOS・Linuxのデスクトップインストーラーは含みません。署名なしWindows版は自動更新と強制更新サービスを使用しません。

開発手順は[AGENTS.md](AGENTS.md)を参照してください。ブラウザ操作のGIF録画は任意で、[record-browser-gif](.agents/skills/record-browser-gif/SKILL.md)を使用できます。

実行前に[安全性に関する注意事項](SAFETY.md)を確認してください。

<a id="run"></a>
## 実行方法

<a id="run-from-source"></a>
### ソースから実行

```sh
git clone https://github.com/Aero123421/Harnova.git
cd Harnova
pnpm install
pnpm run build
pnpm harnova web
```

Web UIは既定で`http://127.0.0.1:3081`に起動します。ブラウザを自動で開かない場合は`--no-open`を指定してください。ユーザーデータは`~/.harnova`、または明示した`HARNOVA_HOME`のフォルダに保存します。継承した`DSH_HOME`や既存の`~/.dsh`は参照しません。詳細は[共存に関する調査](docs/harnova-coexistence-audit.md)を参照してください。

`pnpm run build`で実行に必要な成果物を作成します。`pnpm harnova web`はビルド済みの成果物を使い、再ビルドは行いません。

<a id="contributing"></a>
## コントリビューション

[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

<a id="development"></a>
## 開発用の起動

[開発ガイド](docs/development.md)と[アーキテクチャ](docs/architecture.md)を参照してください。

`pnpm run dev:web`は、1つのターミナルでビルド・配信・ソース変更時のクライアント再ビルドを実行します。`make help`でWebとDesktopのMakeターゲットを確認できます。コマンドの一覧は開発ガイドにあります。

エージェントによる作業は[AGENTS.md](AGENTS.md)に従ってください。

<a id="citation"></a>
## 引用

```bibtex
@misc{deepseek-harness2026,
  title={DeepSeek Harness: Everything is a Plugin},
  author={DeepSeek-AI},
  year={2026},
  publisher={GitHub},
  howpublished={\url{https://github.com/deepseek-ai/deepseek-harness}},
}
```

<a id="license"></a>
## ライセンス

[MIT](LICENSE)

依存するサードパーティのライセンスは[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)に記載しています。
