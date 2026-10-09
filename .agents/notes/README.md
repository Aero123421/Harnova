# Agent Notes

Agent Note は、コード・テスト・既存文書だけでは伝わらない長期的な設計理由を記録する。作業日誌や変更ファイル一覧は不要。機械的変更・局所的 UI 変更に Note を作らない。

## Layout and naming

既存の `proposed/`、`implemented/`、`rejected/` と class directory を使い、`yyyy-mm-dd-topic.md` に記録する。新しい Note は日本語または英語でよく、中国語版・翻訳 sidecar は不要。

## The file format

題名と状態を示し、問題、提案または決定、検討した代替案、結果またはリスクを書く。必要な検証結果と、現在の仕様を所有する文書・コードへのリンクを含める。既存の機械検査が使う status と lifecycle は一致させる。

## Archiving and deletion

関連する理由がある Note は残す。不要な Note を整理するときは参照元を確認し、現在の仕様・互換性・安全性の説明を失わないようにする。新しい Note ごとの全量監査や翻訳は不要。

上流由来の過去 Note と `archived/` は参考資料であり、現在の開発指示ではない。過去 Note の設計内容は維持し、撤去した開発環境へのリンクは過去の参照として記載する。今後の整理で永久凍結・triplet・append-only hash manifest の運用を追加しない。
