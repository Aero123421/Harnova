# AGENTS.md — GitHub Actions

- Harnova の `main` と pull request を対象とし、標準 GitHub-hosted Linux・Windows・macOS runner を使用する。Windows の process 検証は native `pwsh` を使う。
- keyless の検証を標準にする。実 API 検証は必要な場合に設定した秘密情報で実行し、ログへ値を出さない。
- 配布先は `Aero123421/Harnova` の GitHub Releases。アプリ ID・更新先・署名は Harnova 用にする。release の作成・upload は認証と対象を確認する。
- build artifacts を使う検証は先に必要な build を実行する。CI の省略や新しい skip を加える場合は、残る検証で何を確認できるか説明する。
