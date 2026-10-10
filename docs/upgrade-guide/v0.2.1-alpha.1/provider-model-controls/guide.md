---
kind: upgrade-guide
description: "モデルの利用範囲をprofileのON/OFF設定で管理し、ChatGPT接続、Effortスライダー、Fast切り替えを追加する。"
---

# プロバイダー接続と有効モデルの管理

## Change

`base`と`sdk-minimal`は[model-access](../../../../packages/llm/model-access/README.md)をmountする。これまでは登録されたモデルを直接呼び出せたが、今後はprofileの`model-access.providers`で有効にしたモデルだけを利用する。チャット、標準spawn/fork、ワークフロー、Teams、会話圧縮、タイトル生成など、同じHostのLLMを使う呼び出しに共通の条件が適用される。

プロバイダーOFFは認証情報と個別モデルの選択を保持する。設定画面から接続自体を削除する場合は、その経路の許可をOFF・空配列に戻し、追加し直しても以前の許可を自動で使わない。全モデルOFFの空配列も、再起動後に維持する。保存済みSessionがOFFのモデルを選んでいる場合、別モデルへの自動切り替えは行わず、次の要求を止める。OFF前に通信を始めた要求は完了できる。

Pi依存関係は0.87.1から1.1.0へ更新する。`openai`のAPIキーと`openai-codex`のChatGPTログインは別経路として扱う。Pi 1.1.0の新しい`openai` OAuthフローは、既存のCodex OAuthとは別の仕様であり、今回の画面では提供しない。旧`azure-openai-responses` provider IDは、1.1.0の`azure`カタログへの互換経路として継続する。

外部Codex・Claude Code・ACPや別プロセスのSDKサブエージェントは、Hostの有効モデル設定を確実に適用できないため、このポリシーをmountする構成では起動を拒否する。

ACPサーバーとして起動する標準`acp` profileは、現在のDeepSeekカタログにある`deepseek-official/deepseek-flash`を既定にする。ACP handshakeはこのモデルの入力能力に基づき、画像入力も利用可能として返す。以前の`deepseek-v4-flash`を独自の接続で使う場合は、そのモデルを接続設定の`models`へ明示し、利用モデルとしてONにする。

## Migration

1. 更新後に「設定 → モデル」を開く。既存経路は初回に一度だけ移行する。Piの旧カタログと明示的なprofile設定のモデルを保持し、新SDKで増えたモデルは自動でONにしない。候補取得に失敗した経路は設定を修復してからONにする。
2. 接続を追加した場合は、APIキーを設定するか、ChatGPTなど対応するログインを行い、プロバイダーと利用するモデルをONにする。検索中の「表示中をすべてON/OFF」は、その検索結果だけを変更する。
3. チャットのモデルピッカーに選んだモデルが現れることを確認する。以前のモデルがOFFの場合は、有効なモデルを手動で選ぶ。圧縮やタイトル生成に専用モデルを設定している場合は、そのモデルもONにする。
4. 標準サブエージェントにはHost内のspawn/forkを使う。外部委譲を使う独自構成では、バックエンドへポリシーを伝える連携が必要になる。独立したSDK/LLM構成で従来の制約なしの動作が必要な場合は、構成から`model-access` entryを除く。これは全呼び出し共通のON/OFFを保証する構成ではなくなる。

有効化はprofileごとの`cordis.patch.yml`へSettingsサービスが保存する。認証情報の移動・削除やSessionデータのリセットは不要。独自構成で許可集合を直接指定する場合は、[設定例](../../../../packages/llm/model-access/README.md#use-this-package)のように`initialized: true`も指定する。

Effortはモデルが公開する値の離散スライダーで選ぶ。対応するOpenAI経路では稲妻ボタンでFastを切り替えられる。FastとEffortは独立した選択で、Sessionの任意フィールド`speed`として保存する。旧Sessionでフィールドがない場合は接続先の既定動作を維持し、Fastを自動で有効にしない。同じ経路を使う標準の子は親の最新要求を引き継ぎ、別モデルを選ぶ子は引き継いだFastを解除する。Session形式の世代変更やmigrationは不要。

認証画面を閉じると未完了のログインを中止する。すでに保存されている認証情報は残る。実アカウントのログイン・契約ごとの利用可否は、通信を置き換えたテストでは検証できないため、接続先での確認が必要になる。
