---
kind: upgrade-guide
description: "フィードバック・利用情報送信・会話ログ追加送信の撤去と、既存設定の移行。"
---

# フィードバックと利用情報送信の撤去

## Change

Harnova の同梱構成から、フィードバック画面・`/feedback`・アンケート、操作情報の収集と OTLP 送信、DeepSeek への会話ログ追加送信とプラグイン一覧送信を撤去しました。モデルリクエストの匿名利用者 ID・セッション ID・圧縮用途の追跡ヘッダーも付加しません。

通常のモデル API と認証、ツール実行、ローカル履歴保存、セッションログの手動ダウンロードは維持します。システムプロンプトと応答言語の指示は変更しません。

`productAnalytics`・`productTelemetry`・`messageFeedback`・`sessionFeedback` のサービス、対応する Remote API とフィードバック UI は提供しません。`command-feedback`・`message-feedback`・`session-log-deepseek` の公開 entry は過去の保存イベント型のみを残し、Cordis プラグインとしては読み込めません。過去のフィードバックと配送確認イベントを含むセッションは従来の形式で読み込めます。

## Migration

独自 profile の `cordis.yml`、`cordis.patch.yml`、ホームまたは起動時の patch から、次の旧 row と、それを参照する設定・並べ替えを削除してください。

- `command-feedback`、`message-feedback`、`ui-message-feedback`
- `session-log-deepseek`、`ui-settings-session-log`
- `product-analytics`、`desktop-product-telemetry`、`session-telemetry-otel`
- `plugin-package-inventory-deepseek`

フィードバック用途でのみ追加していた `otel` row も削除してください。汎用 OTel と session-telemetry の SDK は独自拡張用に残っていますが、Harnova は collector を設定・起動しません。

`@deepseek-ai/dsh-anonymous-user-id` と匿名 ID 作成 API は撤去しました。既存の `.anonymous-user-id` ファイルは読みません。

`ui-settings-account` の `contactFormUrl` と `contactSource` を削除してください。独自 SDK 利用者は `DeepSeekAdapterOptions.resolveUserId` と撤去したサービス・Remote・UI entry への参照を削除してください。認証に必要なアカウント ID・デバイス登録は引き続き認証機能で使用します。

profile を起動し、`/feedback` とフィードバックボタン・利用情報送信設定が表示されず、通常の会話と履歴のダウンロードが使えることを確認してください。旧セッションファイルの削除や履歴の書き換えは不要です。
