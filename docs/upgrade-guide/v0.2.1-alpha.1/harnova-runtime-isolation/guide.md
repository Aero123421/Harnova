---
kind: upgrade-guide
description: "Harnova の保存先、CLI、Desktop 識別情報、更新設定を上流から分離する。"
---

# Harnova の実行環境の分離

## Change

Harnova の既定ホームは `~/.dsh` から `~/.harnova` に、上書き環境変数は `DSH_HOME` から `HARNOVA_HOME` に変わります。設定、認証情報、セッション、ホームの指示、プラグイン、キャッシュを同じ専用ルートで扱います。旧ホームの探索・自動コピーは行いません。

公開コマンドとリポジトリの起動 script は `dsh` から `harnova` に変わります。Desktop が管理するリンク、Windows 登録情報、Python runtime wheel の console command も `harnova` です。Web の既定ポートは `3081` になります。既存の `--port` や `webserver.config.port` による明示設定は有効です。

Desktop は `io.github.aero123421.harnova`、公開 URL スキームは `harnova`、配布用 manifest 名は `harnova-desktop` を使います。Electron のデータは OS の `appData/Harnova` に置きます。Windows アンインストールは Harnova の Electron データと updater キャッシュを削除対象とし、ホームのユーザーデータを保持します。

Desktop の `DSH_DESKTOP_*` 設定は `HARNOVA_DESKTOP_*` に、更新配布の `DOWNLOAD_TEST_*`／`DOWNLOAD_PROD_*` は `HARNOVA_DOWNLOAD_TEST_*`／`HARNOVA_DOWNLOAD_PROD_*` に変わります。本番更新にも `HARNOVA_DOWNLOAD_PROD_ORIGIN` の明示設定が必要です。上流のアプリ ID 名前空間と DeepSeek の更新 origin は拒否します。

## Migration

- スクリプトを `pnpm harnova web` や `harnova --profile <name>` に変更し、ホームの指定には `HARNOVA_HOME` を使ってください。旧 `DSH_HOME` は無視されます。
- 旧データを使う場合は、両アプリを終了し必要なデータを別ルートにコピーしてください。旧ホーム自体を Harnova に共有しないでください。設定内の明示的な `dshHome` や絶対パスも見直してください。
- Web への接続 URL を `http://127.0.0.1:3081` に変更してください。既にポートを明示設定している場合は、その値を引き続き使えます。
- Desktop の `.env.windows`／`.env.macos` は新しい `.example` と照合し、Harnova 用の ID、更新 origin、必要な署名・policy 設定を用意してください。旧キャッシュ・更新テスト manifest は自動で引き継ぎません。
- TypeScript SDK の解決処理は同じバージョンの `harnova` bin を要求します。SDK と CLI を一緒に更新してください。Python SDK と runtime wheel も一緒に更新し、上流 SDK と共存する場合は別の仮想環境を使ってください。
- `harnova --profile <name> --dump-config` の出力のホーム patch が Harnova ルートを指すことを確認してください。Desktop のコマンド管理画面も `harnova` のパスを表示します。

内部パッケージ名、`dshHome` フィールド、プラグインメタデータ、保存済み Session の形式は維持します。npm／PyPI の公開名は未分離なので、同一のグローバルパッケージ領域への両製品のインストールは避けてください。[共存調査](../../../harnova-coexistence-audit.md)に実装箇所と検証範囲をまとめています。
