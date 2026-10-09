/**
 * `command` namespace dictionaries: the composer menu's section headings,
 * the client face (title, description, claim token) of the built-in Host
 * commands whose catalog descriptors carry English text only, and the
 * popupSelect shell's copy.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'section.add': '添加',
  'section.commands': '指令',
  'label.goal': '目标',
  'label.plan': '计划',
  'label.compact': '压缩',
  'label.permission': '权限',
  'label.export': '下载日志',
  'description.goal': '设置或查看长期任务目标',
  'description.plan': '进入或退出计划模式',
  'description.compact': '压缩以上对话内容',
  'description.permission': '切换权限预设（沙箱模式与审批策略）',
  'description.export': '将当前会话内容导出为 ZIP',
  'token.goal': '目标',
  'token.plan': '计划',
  'token.compact': '压缩',
  'token.permission': '权限',
  'token.export': '导出',
  'search.placeholder': '搜索…',
  'search.aria': '筛选选项',
  'status.loading': '正在加载选项…',
  'status.applying': '正在应用…',
  'status.empty': '无选项',
  'overlay.aria': '/{command} 选项',
  'listbox.aria': '/{command} 匹配项',
  'notice.attachmentsUnsupported': '/{command} 不接受附件，请先移除附件',
} satisfies Record<string, string>

/** The command namespace key union. */
export type CommandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'section.add': 'Add',
  'section.commands': 'Commands',
  'label.goal': 'Goal',
  'label.plan': 'Plan',
  'label.compact': 'Compact',
  'label.permission': 'Permission',
  'label.export': 'Export',
  'description.goal': 'Set or view the goal for a long-running task',
  'description.plan': 'Enter or leave plan mode',
  'description.compact': 'Compact older conversation history',
  'description.permission': 'Switch the permission preset (sandbox mode + approval policy)',
  'description.export': 'Download this Session log as a ZIP archive',
  'token.goal': 'goal',
  'token.plan': 'plan',
  'token.compact': 'compact',
  'token.permission': 'permission',
  'token.export': 'export',
  'search.placeholder': 'Search…',
  'search.aria': 'Filter options',
  'status.loading': 'Loading options…',
  'status.applying': 'Applying…',
  'status.empty': 'No options',
  'overlay.aria': '/{command} options',
  'listbox.aria': '/{command} matches',
  'notice.attachmentsUnsupported': '/{command} does not accept attachments; remove them first',
} satisfies Record<CommandKey, string>

/** Japanese copy shipped with Harnova. */
export const ja = {
  'section.add': '追加',
  'section.commands': 'コマンド',
  'label.goal': '目標',
  'label.plan': '計画',
  'label.compact': '簡潔',
  'label.permission': '権限',
  'label.export': 'エクスポート',
  'description.goal': '長時間のタスクの目標を設定・表示',
  'description.plan': '計画モードの開始・終了',
  'description.compact': '古い会話履歴を圧縮',
  'description.permission': '権限プリセットを切り替え（サンドボックスと承認方針）',
  'description.export': 'このセッションのログをZIPでダウンロード',
  'token.goal': 'goal',
  'token.plan': 'plan',
  'token.compact': '圧縮',
  'token.permission': 'permission',
  'token.export': 'export',
  'search.placeholder': '検索…',
  'search.aria': '選択肢を絞り込み',
  'status.loading': '選択肢を読み込んでいます…',
  'status.applying': '適用中…',
  'status.empty': '選択肢なし',
  'overlay.aria': '/{command}の選択肢',
  'listbox.aria': '/{command}の一致結果',
  'notice.attachmentsUnsupported': '/{command}は添付ファイルに対応していません。先に削除してください',
} satisfies Record<keyof typeof en, string>
