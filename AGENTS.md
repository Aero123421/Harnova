# AGENTS.md

Harnova は DeepSeek Harness を基にした、Cordis プラグインで構成する AI エージェントです。開発方針は [README](README.md)、構造は [architecture](docs/architecture.md)、文書編集は [docs/AGENTS.md](docs/AGENTS.md) を参照してください。

## Harnova development

- Windows・macOS・Linux の通常の開発機能を維持する。日本語 UI は標準対応で、明示的な言語設定を優先する。Security Mode と SSH ワークスペースは開発予定として記載する。
- 独自機能は既存のプラグイン拡張点を優先する。Security Mode と SSH の実行先選択は独立させる。
- 主ブランチは `main`。Push・PR 先は `origin` の `Aero123421/Harnova`。`upstream` は更新取得専用とし、上流への Push・PR はユーザーの明示的な依頼が必要。
- ブランチは原則 `codex/`、コミットと PR は日本語で作成する。履歴を書き換える場合は remote の現在値を確認し、`--force-with-lease` を使う。
- CI は標準の GitHub-hosted Actions runner を使用する。配布は Harnova の GitHub Releases を使用し、アプリ ID・署名・更新先を上流から独立させる。

<a id="conventions"></a>
<a id="secrets--env"></a>
<a id="type-safety-and-documentation"></a>
<a id="defensive-patterns"></a>
<a id="pre-stable-apis-and-released-session-data"></a>
## 実装と安全性

- `packages/` の変更前に architecture を読む。lifecycle、並行処理、subprocess、teardown の変更前に [defensive patterns](docs/defensive-patterns.md) を読む。
- TypeScript strict と ESM を維持する。パッケージ間は package 名、ローカル import は `.ts` を使う。Host と Client のコンパイラー設定を混ぜない。
- Cordis 登録は `ctx.effect()` / `ctx.on()` で解除可能にし、waterfall listener は委譲時に `next()` を呼ぶ。プラグインの export、設定、依存関係を実際の Loader 構成で検証する。
- 秘密情報をコミット・出力しない。モデル／ツール JSON、保存データ、設定、worker・process・wire からの入力を検証する。型の不一致を隠すための二重 cast を追加しない。
- モデルに渡す情報は Session log から再構成できるようにする。保存済み Session の形式・migration・世代を維持し、変更時は [version/status](docs/session-format-status.md) と [type acknowledgements](docs/cookbook/reviewing-persistence-type-changes.md) に従う。
- 通常の Node アプリ起動は `dsh` profile を使う。新機能のために別の非公開起動経路を増やさない。
- UI の製品文字列は typed locale dictionary に置く。ユーザー入力・モデル出力・wire token は翻訳しない。
- `vendor/` は [vendor/README.md](vendor/README.md) の同期・変更記録に従う。fixture、snapshot、製品に同梱する Skill は開発手順書と区別する。

## Run relevant checks locally

[testing policy](docs/testing.md) と [dsh-pre-push-checks](.agents/skills/dsh-pre-push-checks/SKILL.md) に従い、変更に関係する最小の検証を実行する。既に成功した検証を commit・push のためだけに繰り返さない。実行したコマンドと結果のみ報告する。

- keyless の unit・integration・recorded-session replay を標準にする。UI・モデル出力変更は関連する期待値を確認する。
- 実 provider を変えた場合は必要な実 API smoke を選ぶ。鍵がない場合は未検証として報告する。
- 文書・生成資料は `pnpm run test:docs` または変更に応じた `pnpm run doc-sync`。公開 entry・build 設定変更は build と関連 smoke を含める。
- API、CLI、設定、保存データに外部から見える破壊的変更がある場合は [upgrade guide](.agents/skills/dsh-create-upgrade-guide/SKILL.md) を更新する。
- Agent Note は長期的に必要な設計理由だけを書く。機械的変更・局所的 UI 変更には不要。英中翻訳の同時更新、全 UI PR の GIF、native GitHub stack、上流の担当者承認は開発の必須条件にしない。

## Commands

```sh
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test
pnpm run test:snapshot
pnpm run test:docs
pnpm run doc-sync
pnpm run dev:web
pnpm run dev:desktop
```

その他のコマンドは [package.json](package.json) が正本。`CLAUDE.md` は `AGENTS.md` の symlink なので実体を編集する。
