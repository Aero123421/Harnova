# AGENTS.md — Documentation

Harnova の文書は必要な読者に届く言語で作成する。日本語・英語どちらでもよく、中国語版や翻訳 sidecar の同時更新は不要。

## Writing rules

- 使用方法・前提・設定・失敗時の対応・制限を、現在のコードと検証できる事実に基づいて書く。実行していないコマンドを検証済みと記載しない。
- コード変更に関係する README・JSDoc を更新する。生成資料は source または generator を編集し、再生成する。
- package の仕様は package README、構造は architecture、操作手順は cookbook、長期的な設計理由は [Agent Notes](../.agents/notes/README.md) に置く。同じ説明を複数箇所で維持しない。
- 語数・固定章順・特定の単語を理由に正しい情報を削らない。文書の長さは必要な情報に合わせ、不要な重複や作業実況を省く。
- 既存の `type-equiv` / `public-api` fence と generated region は対応する source・manifest と合わせて更新する。通常の TypeScript サンプルは文書型チェックで確認する。
- 過去の上流 Agent Notes は参考資料で、Harnova の現在の指示より優先しない。過去 Note の設計内容は維持し、撤去した開発環境へのリンクは過去の参照として記載する。

## Validation

文書変更は関連する検査から始める。`pnpm run test:docs` は軽い文書検査、`pnpm run doc-sync` は生成資料・コード例・文書サイトを含む検査。生成資料や公開サイトに影響する変更は対応する検査も実行する。ファイルの移動・削除では現行文書の inbound link とサイト manifest を直す。

詳しい編集手順は [dsh-doc](../.agents/skills/dsh-doc/SKILL.md)、文章の判断は [dsh-prose-standard](../.agents/skills/dsh-prose-standard/SKILL.md)。
