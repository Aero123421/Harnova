/** `settings.permission` namespace dictionaries (the Permission row's copy). */

/** Locale namespace shared by both current-session permission pickers. */
export const PERMISSION_ACCESS_NS = 'permission.access'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '权限',
  'description': '选择新会话的默认权限模式',
  'loading': '加载中',
  'unavailable': '不可用',
  'preset.readOnly': '仅可查看',
  'preset.workspaceWrite': '工作区内修改',
  'preset.fullAccess': '完全权限',
  'confirm.title': '确认启用完全权限？',
  'confirm.description': '启用完全权限后，新会话将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任后续任务时使用。',
  'confirm.acknowledge': '我已了解风险，并愿意继续',
  'confirm.cancel': '取消',
  'confirm.enable': '启用完全权限',
} satisfies Record<string, string>

/** The settings.permission namespace key union. */
export type PermissionSettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'title': 'Permission',
  'description': 'Choose the default permission mode for new sessions',
  'loading': 'Loading',
  'unavailable': 'Unavailable',
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access lets new sessions reduce confirmation steps and perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust subsequent tasks.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
} satisfies Record<PermissionSettingsKey, string>

/** Simplified Chinese dictionary for the current-session popup gate. */
export const accessZh = {
  'mode': '访问模式，当前：{name}',
  'close': '关闭',
  'preset.readOnly': '仅可查看',
  'preset.workspaceWrite': '工作区内修改',
  'preset.fullAccess': '完全权限',
  'confirm.title': '确认启用完全权限？',
  'confirm.description': '启用完全权限后，智能体将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。',
  'confirm.acknowledge': '我已了解风险，并愿意继续',
  'confirm.cancel': '取消',
  'confirm.enable': '启用完全权限',
  'auto.label': 'Auto review',
  'auto.badge': 'EXP',
  'auto.description': '无沙箱运行；每次原生工具调用和 PTC 内层调用前由同一模型进行实验性审查。',
  'auto.confirm.title': '确认启用 Auto review（实验）？',
  'auto.confirm.description': 'Auto review 不使用沙箱。每次原生工具调用和 PTC 内层调用前，都会由与当前 agent 相同的模型进行审查；审查拒绝的调用由你批准或拒绝。此功能仍属实验性，可能误放行或误拒绝，并会消耗额外 token。',
  'auto.confirm.acknowledge': '我已了解这些风险，并愿意继续',
  'auto.confirm.enable': '启用 Auto review',
} satisfies Record<string, string>

/** Current-session popup-gate key union. */
export type PermissionAccessKey = keyof typeof accessZh

/** English dictionary for the current-session popup gate. */
export const accessEn = {
  'mode': 'Access mode, current: {name}',
  'close': 'Close',
  'preset.readOnly': 'Read Only',
  'preset.workspaceWrite': 'Workspace Write',
  'preset.fullAccess': 'Full access',
  'confirm.title': 'Enable Full access?',
  'confirm.description': 'Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.',
  'confirm.acknowledge': 'I understand the risks and want to continue',
  'confirm.cancel': 'Cancel',
  'confirm.enable': 'Enable Full access',
  'auto.label': 'Auto review',
  'auto.badge': 'EXP',
  'auto.description': 'Run without a sandbox after an experimental same-model review of every native tool call and PTC inner call.',
  'auto.confirm.title': 'Enable Auto review (experimental)?',
  'auto.confirm.description': 'Auto review runs without a sandbox. Before every native tool call and PTC inner call, the same model as the current agent reviews whether to allow it; you approve or reject each call it denies. This feature is experimental, can falsely allow or deny actions, and uses additional tokens.',
  'auto.confirm.acknowledge': 'I understand these risks and want to continue',
  'auto.confirm.enable': 'Enable Auto review',
} satisfies Record<PermissionAccessKey, string>

/** Japanese copy shipped with Harnova. */
export const ja = {
  'title': '権限',
  'description': '新しいセッションの既定の権限モードを選択',
  'loading': '読み込み中',
  'unavailable': '利用不可',
  'preset.readOnly': '読み取り専用',
  'preset.workspaceWrite': 'ワークスペースへの書き込み',
  'preset.fullAccess': 'フルアクセス',
  'confirm.title': 'フルアクセスを有効にしますか？',
  'confirm.description': 'フルアクセスでは新しいセッションの確認を減らし、機密性の高い操作、ファイル変更、外部コマンドなどを直接実行できます。今後のタスクを信頼できる場合のみ使用してください。',
  'confirm.acknowledge': 'リスクを理解したうえで続けます',
  'confirm.cancel': 'キャンセル',
  'confirm.enable': 'フルアクセスを有効化',
} satisfies Record<keyof typeof en, string>

/** Japanese copy shipped with Harnova. */
export const accessJa = {
  'mode': 'アクセスモード、現在: {name}',
  'close': '閉じる',
  'preset.readOnly': '読み取り専用',
  'preset.workspaceWrite': 'ワークスペースへの書き込み',
  'preset.fullAccess': 'フルアクセス',
  'confirm.title': 'フルアクセスを有効にしますか？',
  'confirm.description': 'フルアクセスでは確認を減らし、機密性の高い操作、ファイル変更、外部コマンドなどを直接実行できます。現在のタスクを信頼できる場合のみ使用してください。',
  'confirm.acknowledge': 'リスクを理解したうえで続けます',
  'confirm.cancel': 'キャンセル',
  'confirm.enable': 'フルアクセスを有効化',
  'auto.label': '自動審査',
  'auto.badge': '試験機能',
  'auto.description': '各ネイティブツール呼び出しとPTC内部呼び出しを同じモデルで審査したあと、サンドボックスなしで実行します。試験的な機能です。',
  'auto.confirm.title': '自動審査（試験機能）を有効にしますか？',
  'auto.confirm.description': '自動審査はサンドボックスなしで実行します。各ネイティブツール呼び出しとPTC内部呼び出しの前に、現在のエージェントと同じモデルで許可を審査します。拒否された呼び出しはユーザーが許可または拒否します。試験的な機能のため判断を誤る可能性があり、追加のトークンを使用します。',
  'auto.confirm.acknowledge': 'これらのリスクを理解したうえで続けます',
  'auto.confirm.enable': '自動審査を有効化',
} satisfies Record<keyof typeof accessEn, string>
