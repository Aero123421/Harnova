# Harnova ロゴの差し替え箇所

差し替え前の状態を記録した調査。実装後の素材と再生成手順は [branding README](../assets/branding/README.md) を参照。採用した v2 C 案を製品に反映するための調査。対象は現在のソース、画像素材、ビルド・配布設定と関連テスト。この文書の表と素材一覧は差し替え前の参照関係・寸法を記録する。実際の Windows・macOS アプリとインストーラーの動作確認も未実施。

採用元は [マーク単体](../assets/branding/harnova-mark.svg) と [文字を含むロゴ](../assets/branding/harnova-logo.svg)。どちらも背景透過のパスで、文字は Montserrat Medium の輪郭を使う。[フォントライセンス](../assets/branding/Montserrat-OFL.txt) と [上流の MIT ライセンス](../LICENSE) を保持する。

## 差し替え箇所の全体像

| 表示箇所 | 現在の所有ファイル | 反映時の対応 |
| --- | --- | --- |
| サイドバーの展開時・折り畳み時 | `packages/client/ui-sidebar/src/client/SidebarRoot.tsx`、`packages/client/ui-brand-official/src/client/Brand.tsx` | ロゴと文字を別々に反映。slot と fallback の両経路を確認 |
| 新しい会話の開始画面 | `packages/client/ui-conversation/src/client/skeleton/EmptyHero.tsx` | hero の mark slot とクジラの fallback を更新。既存の泳ぐ動作も見直す |
| エージェント実行中の表示 | `packages/client/ui-chat/src/client/chat/RunningWhaleTail.tsx`、`running-whale@2x.png` | APNG と静止 SVG の両方を更新、または Harnova に合う共通の進行表示に変更 |
| 起動中・プラグイン読み込み失敗画面 | `packages/client/web/src/boot-page.ts` | 固定文字 `HARNESS` を Harnova の表示に更新。React・ブランドプラグインが使えない段階でも表示できること |
| ブラウザタブ・PWA | `apps/web/public/favicon.svg`、`favicon-dark.svg`、`manifest.webmanifest` | 明暗のマークと PWA の製品名を更新 |
| デスクトップ初回起動画面 | `apps/desktop/renderer/assets/welcome-brand.svg`、`apps/desktop/src/client/WelcomePage.tsx` | マークと文字を含む素材、表示比率、alt を更新 |
| アプリ内オンボーディングの説明画像 | `packages/client/ui-settings-account/src/client/assets/onboarding-{welcome,recharge}*.png` | 元のロゴが焼き込まれた 8 枚。welcome は再作成、recharge は公式課金連携の撤去と合わせて整理 |
| デスクトップアプリ・Dock・Windows の実行ファイル | `apps/desktop/resources/icon-{windows,macos}.{svg,png}` | 各 OS の余白を維持して Harnova マークを置き、PNG も再生成 |
| About・終了確認のアプリ画像 | `apps/desktop/src/main.ts`、`apps/desktop/scripts/electron-builder-config.mjs` | 現在は Windows 用 PNG を共通画像として使用。開発時・配布時を確認 |
| Windows のシステムトレイ | `apps/desktop/resources/tray-windows.ico`、`apps/desktop/scripts/render-tray-icon.ts` | ベクター素材から各解像度の ICO を再生成 |
| Windows のインストール・アンインストール画面 | `apps/desktop/installer/assets/`、`prepare-windows-installer.ps1` | 5 枚の PNG を更新し、準備処理で BMP を再生成 |
| 文書サイト | `website/public/favicon.svg`、`website/.vitepress/config.ts` | favicon を更新。現在のナビゲーションは文字の Harnova なので、画像ロゴを入れるなら別途設定 |
| 任意の文書用バッジ Skill | `packages/skill/skill-badge/assets/dsh-badge.png` と `dsh-badge.md` | 画像・リモートバッジの指定・リンクを一緒に整理。base では現在 disabled |

画像素材の形式・サイズ・利用状況は [素材一覧](audits/branding-assets.tsv) に記録する。クジラの APNG、説明画像、任意の文書バッジを含めて 27 ファイルあり、ほかに TSX 内に直接記述されたパスがある。

## Web クライアントの経路

### 共通の絵と公式ブランドのプラグイン

[FishLogo.tsx](../packages/client/ui-primitives/src/FishLogo.tsx) はクジラのパスを `currentColor` で描く。横幅を `size`、高さを元の 23.16 × 17.04 の比率で計算する。

[BrandWordmark.tsx](../packages/client/ui-primitives/src/BrandWordmark.tsx) は DeepSeek の文字と HARNESS バッジをパスで持ち、クジラもこのファイルに別途埋め込む。`includeMark={false}` は表示範囲を切り替えるため、FishLogo のパスだけ変えても文字のロゴは変わらない。両方は [ui-primitives の公開 export](../packages/client/ui-primitives/src/index.ts) に含まれる。置き換えや export の削除を行う場合は外部利用者への影響も確認する。

[公式ブランドの browser entry](../packages/client/ui-brand-official/src/client/index.ts) は `DSH_CLIENT_BUILD_PROFILE === 'official'` のときだけ `sidebar.brand.mark` と `sidebar.brand.name` に登録する。hero の slot には登録しない。Loader の構成は [web-app の patch](../packages/bundle/web-app/cordis.patch.yml) と [依存宣言](../packages/bundle/web-app/package.json) にある。

Harnova のブランドプラグインに置き換えるなら、サイドバーの二つの slot と `conversation.hero.brand.mark` を占有し、構成と依存宣言も更新する。`official` を外すだけでは、現在の fallback にクジラが残る。fallback 自体も Harnova に揃える方針なら、それぞれの所有パッケージを更新する必要がある。

### サイドバーと会話開始画面

[SidebarRoot.tsx](../packages/client/ui-sidebar/src/client/SidebarRoot.tsx) は展開時のブランド列と折り畳み時のトグル内に同じ mark slot を描く。どちらも FishLogo の fallback がある。name slot の fallback は locale の `brand.localBuild` とビルド情報。Windows のタイトルバーを使う場合や macOS のウィンドウをドラッグする領域もあるため、クリックとドラッグを維持する。

[EmptyHero.tsx](../packages/client/ui-conversation/src/client/skeleton/EmptyHero.tsx) は 34px の mark slot を描き、fallback の HeroFish は静止パスと二つの変形用パスを使って SMIL で泳ぐ。[HeroShell.module.css](../packages/client/ui-conversation/src/client/skeleton/HeroShell.module.css) にも傾き・上下移動があり、slot に入れたマークにも適用される。Harnova のパスに差し替えるだけで古い変形用パスを残すと、hover 時にクジラへ変形してしまう。SVG の変形と CSS の泳ぐ動作を一緒に扱う。

### 実行中のクジラは別素材

旧 `RunningWhaleTail.tsx`（現在は [RunningBrandMark.tsx](../packages/client/ui-chat/src/client/chat/RunningBrandMark.tsx) に置き換え） は 16 × 16 の静止パスを直接持つ。[ChatView.module.css](../packages/client/ui-chat/src/client/chat/ChatView.module.css) は通常時に `running-whale@2x.png` を alpha mask として表示する。画像は 28 × 28、60 フレーム、各 50ms の APNG。

静止表示は Reduce Motion、forced colors、mask が使えない環境に対応する。変更する場合もこれらの経路を維持する。[ui-chat のビルド設定](../packages/client/ui-chat/tsdown.config.ts) が APNG を CSS 内の data URL に埋め込むため、画像ファイルの変更に加えてパッケージの再ビルドが必要。ブランド slot の更新では変わらない。

### 起動画面・タイトル・favicon

[boot-page.ts](../packages/client/web/src/boot-page.ts) は React を使わない起動・失敗画面で、`HARNESS` の文字を直接持つ。UI プラグインの登録より前に表示されるため、ブランドプラグインだけでは変更できない。

Web の light favicon は黒、dark favicon は白。[index.html](../apps/web/index.html) の media query が選択する。アプリの theme override と OS の明暗は別なので、既存の選択仕様を維持する。[PWA manifest](../apps/web/public/manifest.webmanifest) は現在 `name: DeepSeek Harness`、`short_name: DSH` で、light favicon を使う。

画像と合わせてタイトルを揃える箇所は [Vite の初期 title](../apps/web/vite.config.ts)、[AppFrame の document title](../packages/client/ui-layout/src/client/AppFrame.tsx)、[locale の local-build 表示](../packages/client/locale/src/locales/en.ts)、[クライアントビルド環境](../scripts/client-build-environment.ts)。公式 profile は DeepSeek Harness を埋め込む。[release family の検証](../scripts/release/families.ts) もその環境を照合するので、タイトルだけの変更とリリース時の検証を合わせる。

## デスクトップと配布素材

### アプリ内オンボーディングの説明画像

[OnboardingWelcomeStep.tsx](../packages/client/ui-settings-account/src/client/OnboardingWelcomeStep.tsx) と [OnboardingCreditStep.tsx](../packages/client/ui-settings-account/src/client/OnboardingCreditStep.tsx) は、それぞれ英語・中国語と明暗の組み合わせで 4 枚、合計 8 枚の PNG を import する。[OnboardingIllustration.tsx](../packages/client/ui-settings-account/src/client/OnboardingIllustration.tsx) と CSS が theme ごとの画像を選ぶ。8 枚すべてに DeepSeek / HARNESS のロゴが焼き込まれており、welcome の絵には会話開始画面のクジラも含まれる。component を変えても画像の中は変わらない。

welcome の説明画像は実際の Harnova UI に合わせて再作成する。recharge の絵は公式アカウント・残高・Top up の UI を説明しており、公式課金連携を外す場合はロゴだけの修正より、credit step と一緒に整理する方針が適切。中国語の画像を削除する場合も、import と locale による選択を同時に直す。

### 初回起動画面

[WelcomePage.tsx](../apps/desktop/src/client/WelcomePage.tsx) は `assets/welcome-brand.svg` を幅 472、高さ 40 で表示する。[welcome.css](../apps/desktop/renderer/welcome.css) にも高さ 40px がある。現在の素材は 472 × 40 で、SVG 内部の media query が明暗の色を切り替える。

採用したフルロゴは 538 × 192 で縦横比が異なる。この素材をそのまま同じ枠へ入れると文字の見え方と余白が変わるため、画面用のレイアウトと表示サイズを調整する。固定した黒の SVG を入れるだけでは dark mode で読めなくなる。alt と tagline の製品名は [desktop locale](../apps/desktop/src/locale.ts) が所有する。

[desktop の tsdown 設定](../apps/desktop/tsdown.config.ts) は welcome 用 JS・CSS と Montserrat のフォント・ライセンスを出力する。`renderer/**/*` はパッケージに含まれるので、元の素材はそのまま配布される。

### OS アイコン・About・トレイ

[electron-builder-config.mjs](../apps/desktop/scripts/electron-builder-config.mjs) は Windows に `icon-windows.png`、macOS に `icon-macos.png` を指定する。両方 1024 × 1024 の RGBA 画像。SVG を編集してもこの PNG は自動で更新されない。Windows と macOS で背景のタイル・余白が異なるため、それぞれの枠にマークを配置して書き出す。

同じ設定は `icon-windows.png` を共通 resource の `icon.png` として同梱する。[main.ts](../apps/desktop/src/main.ts) の About と終了確認の画像は、開発時の `resources/icon-windows.png`、配布時の `resources/icon.png` を読む。macOS の Dock 用アイコンを変えても、この共通画像は別に確認する。

Windows のトレイは配布時に `tray.ico`、開発時に `tray-windows.ico` を読む。[render-tray-icon.ts](../apps/desktop/scripts/render-tray-icon.ts) は `icon-windows.svg` の `tray-glyph` group を拡大し、16 / 20 / 24 / 32 / 40 / 48 / 64px の画像を個別に rasterize して ICO を作る。現在の中心座標と倍率はクジラ用なので、Harnova の配置に合わせて確認する。macOS はこのトレイを使わない。

現在の [ターゲット選択](../apps/desktop/scripts/desktop-build-paths.mjs) は `mac-arm64`、`mac-x64`、`win-x64` のみ。builder 設定に AppImage の記載はあるが、Linux の配布アイコン経路が完成しているとは扱わない。

### Windows インストーラー

`installer/assets/brand.png` と `brand-dark.png` は 600 × 196、`*-2x.png` は 1200 × 392。クジラと DeepSeek / HARNESS の文字が画像に焼き込まれている。明暗・標準 DPI・高 DPI の 4 枚を一緒に更新する。

`uninstaller-sidebar.png` は 164 × 314 の RGB 画像で、クジラのアプリアイコンを持つ。[builder の NSIS 設定](../apps/desktop/scripts/electron-builder-config.mjs) はこれを installer / uninstaller の sidebar に指定する。

[prepare-windows-installer.ps1](../apps/desktop/scripts/prepare-windows-installer.ps1) が上の 5 枚を白または dark 背景に合成して 24bit BMP に変換する。[installer.nsh](../apps/desktop/scripts/installer.nsh)、[pages.nsh](../apps/desktop/installer/pages.nsh)、[lifecycle.nsh](../apps/desktop/installer/lifecycle.nsh)、[window-frame.cpp](../apps/desktop/installer/window-frame.cpp) が準備済みの BMP を使う。生成先の `.desktop-build/` を直接編集せず PNG を更新し、再生成する。

## 文書サイトと使われていない素材

[サイト設定](../website/.vitepress/config.ts) はすでに Harnova の title と文字のナビゲーションを使う。favicon は青いクジラのまま。`website/public/wordmark.svg` は現在のサイトソースに参照が見つからないが、public に残るため整理対象。ロゴを画像化する場合は設定側の HTML・高さ・明暗も合わせる。

`apps/desktop/resources/icon.svg` と `icon.png` は 1104 × 1104 の原画。現在の builder と main から直接使われるのは OS 別の素材で、この原画二つの実行時参照は見つからない。旧素材の削除または Harnova の生成元への置き換えを検討できる。[desktop README](../apps/desktop/README.md) に原画としての説明があるため、整理時は文書も更新する。

### 文書用のクジラ付きバッジ

[skill-badge の provider](../packages/skill/skill-badge/src/index.ts) は任意に有効化すると、公式の `powered by dsh` バッジを文書に入れる Skill を提供する。[PNG](../packages/skill/skill-badge/assets/dsh-badge.png) は 726 × 120 でクジラ付き。[Skill の本文](../packages/skill/skill-badge/assets/dsh-badge.md) は Shields.io の DeepSeek ロゴ、上流 GitHub へのリンク、ロゴや文字を変えないという指示も持つ。これは調査対象の製品 Skill の内容で、Harnova 開発作業への制約ではない。

[base の patch](../packages/bundle/base/cordis.patch.yml) では現在 `disabled: true` なので、標準のセッションで自動的にこのバッジが使われるわけではない。Harnova がこの機能を残す場合は画像だけでなく本文・provider 名・公開名・テストも検討する。不要なら配布する package と依存・設定をまとめて整理する。MIT ライセンスは、このバッジの掲載を要求していない。

auto-review、voice-input-bundle、inspector、inspector-profile、agent-team-profile の package icon と、onboarding の office / code / standard / compact / detailed の SVG も描画して確認した。これらは盾・波形・虫眼鏡・一般的な図形で、DeepSeek のクジラや製品の文字ではない。今回のロゴ差し替えでは対象に含めない。

## 差し替えの進め方

1. 採用した二つの SVG を元に、UI 用の `currentColor` のマークと文字のパス、favicon、OS 用 PNG、インストーラー PNG を生成する経路を決める。別々に手で輪郭を修正しない。
2. Harnova のブランドプラグインと fallback を揃え、サイドバーと hero を確認する。現在のクジラ用 SMIL・CSS を残さない。
3. boot 画面と実行中アイコンの独立した経路を更新する。
4. favicon・PWA、welcome、オンボーディングの説明画像、OS アイコン、トレイ、インストーラー、文書サイトを更新し、それぞれの出力を再生成する。任意の文書バッジは残すか整理するかを決める。
5. 製品 title・alt・メニュー・PWA 名を同期する。`productName` と artifact 名はビルド・更新の影響も確認する。`appId`、protocol、データ保存先の変更は画像差し替えとは別の変更として扱う。特に Electron の `app.name` は userData に影響する。
6. 旧素材を整理し、関連 README・テストの期待値を更新する。保存済み Session、provider 名、MIT 著作権、vendor の表示、型識別用の `brand.ts` や CSS token 名をロゴ変更の一括置換に含めない。

採用マークは 256 × 256 の viewBox 内に余白がある。24px の枠では絵自体が約 17px 幅になるので、元の横長のクジラと並べて大きさ・位置を確認する。16px の favicon / トレイと 14px の実行表示では、斜めの細い余白が見えるかも確認する。小さいサイズの調整が必要な場合は、採用元の輪郭との差分が分かるように扱う。

## 実装後に確認するテストと画面

以下は差し替え後の検証候補で、この調査では未実行。

| 範囲 | 現在の関連テスト・確認事項 |
| --- | --- |
| primitive / slot | `ui-primitives/tests/icons.client.spec.tsx`、`ui-brand-official/tests/browser-plugin.client.spec.tsx`。新しいブランドプラグインなら実際の Loader 構成と解除・再登録も確認 |
| サイドバー / hero | `ui-sidebar/tests/sidebar-styles.client.spec.ts`、`ui-conversation/tests/skeleton.client.spec.tsx`。展開・折り畳み、hover、34px の表示、ドラッグ領域 |
| 実行中 | `ui-chat/tests/running-whale-tail.client.spec.tsx`。通常・Reduce Motion・forced colors・mask 非対応、ビルド後 CSS |
| 起動 / title | `client/web/tests/boot-page.client.spec.ts`、`ui-layout/tests/document-title.client.spec.tsx`、`scripts/client-build-environment.client.spec.ts`、`scripts/release/families.spec.ts` |
| Web 配布 | `apps/web/tests/pwa-manifest.e2e.ts`、`settings-chrome.e2e.ts`、`public-mount.e2e.ts`。base path、favicon の明暗、PWA 名、built assets |
| welcome / native | `apps/desktop/tests/welcome-renderer.client.spec.tsx`、`main-startup.spec.ts`。SVG の高さ・alt、OS の明暗、About の resource |
| アプリ内 onboarding | `ui-settings-account/tests/onboarding.client.spec.tsx`、`onboarding-surface.client.spec.tsx`、`desktop-onboarding-entry.client.spec.tsx`。明暗・locale ごとの画像、credit step の選択と遷移 |
| トレイ / installer | `apps/desktop/tests/tray-icon.spec.ts`、`installer-packaging.spec.ts`。ICO の全サイズ、PNG の同梱、生成した BMP、Windows 上の明暗・DPI |
| 文書サイト | `pnpm docs:check` とサイトのビルド・明暗。生成済み `.generated/` / `.dist/` を直接変更しない |
| 任意の文書バッジ | `packages/skill/skill-badge/tests/skill-badge.spec.ts`。Skill 本文・PNG・provider・base の有効化状態 |

通常・dark・Reduce Motion のブラウザ描画と、Windows・macOS の OS 側表示を区別して検証結果を報告する。画像の shape は accessibility tree に出ない場合があるので、文字の期待値だけで差し替え完了と判断しない。

調査では、ソースから素材・生成処理・利用箇所を追跡し、SVG の viewBox、PNG / ICO のサイズ、APNG のフレーム数を読み取った。Windows / macOS の PNG、installer の brand / sidebar、オンボーディング画像 8 枚、文書バッジ、上記の一般 SVG icon は画像として確認した。資料の検査は `pnpm run test:docs` を使う。
