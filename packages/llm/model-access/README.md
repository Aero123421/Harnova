---
description: "プロバイダーとモデルのON/OFFをprofileへ保存し、チャットとHost内の全LLM呼び出しへ適用する。"
kind: "package-reference"
---

# @deepseek-ai/dsh-model-access

## Summary

設定で有効にしたモデルだけを、チャット、標準サブエージェント、ワークフロー、会話圧縮、タイトル生成で利用する。プロバイダーをOFFにしても、個別モデルの選択と認証情報は保持する。有効化設定はprofile単位、認証情報は既存のcredentialsサービスが管理する。

## Use this package

`base`と`sdk-minimal`に同梱される。設定画面では、接続を設定したあとにプロバイダーと利用するモデルをONにする。チャットには、その設定とアダプターの利用可能モデルの両方に含まれるものだけが表示される。認証情報の存在は、接続先による認証や契約上のモデル利用権の確認ではない。

独自のCordis構成では、LLMサービスとともに次のentryを配置する。

```yaml
- id: model-access
  name: '@deepseek-ai/dsh-model-access'
  config:
    initialized: true
    providers:
      openai-codex:
        enabled: true
        models:
          - gpt-6.1-sol
```

| Field | Default | Meaning |
|---|---|---|
| `initialized` | `false` | 既存設定からの初回移行が完了したか。明示した許可集合を使う構成では`true`にする |
| `providers` | `{}` | provider IDごとの`enabled`と許可するmodel ID配列 |

`models: []`は全モデルOFF。プロバイダーOFFは配列を変更しない。モデル能力を定義する`llm-pi-ai.providers.<id>.models`とは別の設定であり、そちらの空配列は内蔵カタログを使う意味を持つ。

### 既存profileの移行

`initialized: false`では、最初の設定用ディレクトリ・カタログ読み取りまたは要求時に、既存の登録経路を一度だけ保存する。Pi経路では更新前の0.87.1カタログとprofileに明示したモデルを対象にし、SDK更新で新しく増えたモデルは候補のままOFFにする。すでに`providers`へ記録した値は移行値より優先する。候補取得に失敗した経路はOFFの空集合になるため、設定で修復して有効にする。

初回保存後に追加されたプロバイダー・モデルは、自動でONにならない。提供が終わったIDや保存済みSessionの選択を、別モデルへ自動置換しない。設定とLoaderのないSDK構成では初回集合をメモリー内に保持する。再起動をまたいだ選択保存にはprofileか、上記の明示的なboot configが必要になる。

## Understand the implementation

[サービス](src/index.ts)がLLMの共通許可ポリシーを登録する。[LLMサービス](../llm/README.md)は候補一覧を保持しつつ、選択可能な一覧を絞り、準備時と実際のdispatch直前で許可を確認する。OFF前にすでに通信を始めた要求は完了できるが、次の要求は`MODEL_DISABLED`で止まる。waterfallで通信を差し替える呼び出しも確認の対象になる。

認証レコードの読み取り・削除やトークン更新はこのサービスでは行わない。設定変更は既存のSettingsサービスを通してprofileへ保存される。ポリシー登録と委譲の起動ガードはentryのunload時に解除される。

## Further Exploration

- [モデル設定画面](../../client/ui-settings-models/README.md) — 接続と個別の有効化。
- [モデルピッカー](../../client/ui-model-selection/README.md) — 有効モデルの選択、Effort、Fast。
- [移行ガイド](../../../docs/upgrade-guide/v0.2.1-alpha.1/provider-model-controls/guide.md) — 既存profileと外部委譲への影響。

## Model Experience

許可されたモデルへの要求内容、システムプロンプト、ツール、エージェントループは変更しない。OFFの経路は通信を開始せず、呼び出し元へエラーを返す。タイトル生成などのfallbackは各呼び出し元が所有する。

## Known Limitations and Deferred Work

この設定が適用される範囲は、同じLLMサービスを使うHost構成。標準spawn/forkは対象だが、別プロセスのSDKや外部Codex・Claude Code・ACPバックエンドは、同じ許可集合を適用できる連携が実装されるまで`MODEL_ACCESS_UNSUPPORTED`で起動を拒否する。独自バックエンドが`modelRouting: 'host'`を宣言する場合は、全モデル呼び出しをこのHostのLLMへ通す責任を持つ。

このプラグインをmountしない独立したLLMライブラリー構成には、許可ポリシーを追加しない。別profileや別マシンへ設定を同期する機能はない。
