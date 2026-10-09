---
description: "Harnova と DeepSeek Harness の保存先、OS 登録、CLI、更新先の分離。"
---

# DeepSeek Harness との共存

Harnova は独立したデータルートと OS 上の識別情報を使います。起動時に上流の設定、認証情報、セッションを探したり、自動移行したりする処理はありません。Harnova の Desktop と CLI は、Harnova のホームだけを共有します。

## 調査結果と変更

| 対象 | 上流との衝突要因 | Harnova の動作 |
| --- | --- | --- |
| 設定・認証情報・セッション・プラグイン・キャッシュ | 共通の `~/.dsh` と `DSH_HOME` | `~/.harnova` と `HARNOVA_HOME`。旧環境変数へのフォールバックなし |
| グローバル指示とホームの `.env` | 上流ホーム内の指示・環境変数が読み込まれる | Harnova ホームを基準に探索。プロジェクト自身の指示・`.env` は従来どおり |
| Electron の設定・Cookie・LocalStorage・ログ・単一起動 | パッケージ名から決まる共通保存先 | `appData/Harnova`。ログ初期化や単一起動判定より前に `userData` と `sessionData` を設定 |
| Desktop アプリ ID | 上流の Bundle ID・Windows 登録 | `io.github.aero123421.harnova`。`com.deepseek` 名前空間を拒否 |
| OS の URL スキーム | `dsh` のハンドラーを上書き | `harnova`。開発アプリは `harnova-dev` |
| 公開 CLI | 既存の `dsh` コマンドを置換 | `harnova`。Desktop の macOS リンクは `/usr/local/bin/harnova`、Windows は `harnova.cmd` |
| CLI 管理状態 | 共通の領収書・バックアップ・レジストリ・mutex | `.harnova-desktop-command.json`、Harnova 用バックアップ、`Software\Harnova\Command`、`Global\Harnova.Command.<SID>` |
| Web の既定ポート | 両製品が `3080` を使用 | Harnova は `3081`。Desktop Host は引き続き OS が割り当てるポート |
| インストーラーと updater キャッシュ | パッケージ名由来の updater・アンインストール識別 | 配布用 manifest 名を `harnova-desktop` に設定 |
| Windows アンインストール | パッケージ名の旧 Electron データまで削除 | Harnova の Electron データと専用 updater キャッシュだけを対象にする。Harnova ホームは保持 |
| 署名キャッシュ・署名処理の記録 | 共通のホーム配下ディレクトリ | `.harnova-desktop-signing`。macOS 公証用プロキシのキャッシュも専用名前空間 |
| 自動更新と更新テスト | `download.deepseek.com` や上流のテスト用バケットが固定 | Harnova の明示設定から取得。DeepSeek の更新 origin を拒否。資格確認用 namespace も Harnova 専用 |
| Desktop の環境変数 | 上流のランチャー設定や署名設定を継承 | `HARNOVA_DESKTOP_*` と `HARNOVA_DOWNLOAD_*`。署名用 CMD、Node ランチャー、設定例も変更 |
| シェルへの環境注入 | 継承値でホームが混ざる | 親の `DSH_*` と `HARNOVA_*` を除去し、実行中の Harnova ホームを再注入。Desktop の login-shell 読み込みでも専用値を保持 |

ホーム解決は [home-paths](../packages/util/home-paths/src/index.ts)、Electron 初期化は [identity](../apps/desktop/src/identity.ts)、配布設定は [electron-builder-config](../apps/desktop/scripts/electron-builder-config.mjs)、削除対象は [uninstall](../apps/desktop/installer/uninstall.nsh) が正本です。

## 運用と互換性

新規起動は空の Harnova 環境から始まります。既存データを使う場合は、両製品を終了して必要なファイルを別ディレクトリにコピーし、コピー側だけを `HARNOVA_HOME` に設定してください。両製品に同じディレクトリを明示設定すると、分離は失われます。旧ルートを指す `dshHome` 設定や絶対パスも手動で見直す必要があります。

内部の `@deepseek-ai/dsh-*` パッケージ名、Cordis の `dsh` メタデータ、`dshHome` 設定フィールド、SDK の型名、保存済み Session の形式、Electron 内部の `dsh-app` スキームは維持します。これらはプラグイン・データ形式の契約であり、OS に登録する公開スキームとは別です。Python の console command は `harnova` へ変更しますが、Python の配布パッケージ名と import 名はまだ上流の名前です。

現時点の GitHub Releases 用開発アーカイブにも上流の npm パッケージ名が残ります。同じ npm グローバル領域や Python 環境に両製品の同名パッケージをインストールすると上書きされるため、Harnova のソースチェックアウト、Desktop の内蔵ランタイム、別の Python 仮想環境を使ってください。独立した npm／PyPI 公開名への変更は、公開依存グラフ全体を扱う別作業です。

配布用署名と Harnova の実際の更新先は別途設定が必要です。この変更は GitHub Releases 向けの自動更新方式を実装するものではなく、既存の COS 配布・強制更新 policy の仕組みは明示設定で残ります。アカウント連携、フィードバック、telemetry の撤去もこの分離変更には含みません。

## 検証

CLI 共存テストは実際の CLI でホームの patch を合成し、旧 `DSH_HOME` と `~/.dsh` があっても Harnova の patch だけが使われ、上流ファイルが同じ内容で残ることを確認します。Electron 保存先のテストとコマンド管理テストも、上流ファイルを隣に置いて内容の保持を確認します。更新設定は旧環境変数、上流アプリ ID、上流 origin の拒否を検証します。

OS 固有の registry、URL スキーム登録、インストール、アンインストールの実機共存は、Windows／macOS の配布候補で確認する必要があります。Linux での型チェック・ビルド・テストだけでは、これらの実機動作や実際の署名・更新サービスの動作を確認したことにはなりません。
