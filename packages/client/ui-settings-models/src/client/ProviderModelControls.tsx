/** Provider and model switches write the shared allowlist, never credential records. */
import { useRef, useState } from 'react'
import { Input, Switch, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ModelsOperations } from './operations.ts'
import type { ProviderRow } from './store.ts'
import type { en } from './locales.ts'
import css from './ModelsSection.module.css'

/** One connection's candidate catalog and confirmed model preferences. */
export function ProviderModelControls({ row, namespace, operations, expanded, readOnly, reload, t }: {
  row: ProviderRow
  namespace: SettingsNamespaceView
  operations: ModelsOperations
  expanded: boolean
  readOnly: boolean
  reload: () => Promise<void>
  t: (key: keyof typeof en) => string
}) {
  const saving = useRef(false)
  const [pending, setPending] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyEnabled, setOnlyEnabled] = useState(false)
  const [toast, setToast] = useState<{ seq: number; text: string } | null>(null)
  const selected = row.enabledModels ?? []
  const ids = new Set(selected)
  const candidates = row.candidates ?? []
  const visible = candidates.filter(model => (!onlyEnabled || ids.has(model.id))
    && `${model.name} ${model.id}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const savedCount = candidates.filter(model => ids.has(model.id)).length

  const save = async (enabled: boolean, models: readonly string[]): Promise<void> => {
    if (saving.current || readOnly) return
    saving.current = true
    setPending(true)
    try {
      const result = await operations.writeSettings(namespace.ns, [{
        op: 'set', path: ['providers', row.entry.provider], value: { enabled, models: [...models] },
      }], namespace.revision)
      if (result.kind !== 'written') {
        setToast(previous => ({ seq: (previous?.seq ?? 0) + 1, text: result.message }))
        return
      }
      await reload()
      setToast(previous => ({ seq: (previous?.seq ?? 0) + 1, text: t('modelAccessSaved') }))
    } catch {
      setToast(previous => ({ seq: (previous?.seq ?? 0) + 1, text: t('modelAccessFailed') }))
    } finally { saving.current = false; setPending(false) }
  }
  const enabled = row.enabled === true
  const countText = t(enabled ? 'modelsEnabledCount' : 'modelsSavedCount').replace('{count}', String(savedCount))
  return (
    <div className={css['modelAccess']} aria-busy={pending}>
      <div className={css['modelAccessHead']}>
        <span className={css['fieldLabel']}>{countText}</span>
        <Switch checked={enabled} label={t('providerEnabled').replace('{provider}', row.entry.displayName)}
          disabled={readOnly || pending} onChange={(next) => { void save(next, selected) }} />
      </div>
      {expanded ? (
        <>
          <p className={css['advancedHint']}>{t('modelAccessHint')}</p>
          <div className={css['modelAccessHead']}>
            <Input value={query} placeholder={t('modelSearch')} aria-label={t('modelSearch')}
              onChange={(event) => { setQuery(event.target.value) }} />
            <label className={css['modelFilter']}><input type="checkbox" checked={onlyEnabled}
              onChange={(event) => { setOnlyEnabled(event.target.checked) }} />{t('modelsEnabledOnly')}</label>
          </div>
          <div className={css['modelAccessHead']}>
            <button type="button" className={css['secondaryButton']} disabled={readOnly || pending || visible.length === 0}
              onClick={() => { void save(enabled, [...new Set([...selected, ...visible.map(model => model.id)])]) }}>{t('enableVisibleModels')}</button>
            <button type="button" className={css['secondaryButton']} disabled={readOnly || pending || visible.length === 0}
              onClick={() => { const visibleIds = new Set(visible.map(model => model.id)); void save(enabled, selected.filter(id => !visibleIds.has(id))) }}>{t('disableVisibleModels')}</button>
          </div>
          <ul className={`${css['modelChoices']} scrollable`}>
            {visible.map(model => (
              <li key={model.id} className={css['modelAccessHead']}>
                <span>{model.name}</span>
                <Switch checked={ids.has(model.id)} label={t('modelEnabled').replace('{model}', model.name)}
                  disabled={readOnly || pending} onChange={(next) => {
                    void save(enabled, next ? [...new Set([...selected, model.id])] : selected.filter(id => id !== model.id))
                  }} />
              </li>
            ))}
          </ul>
          {row.candidateError === undefined ? null : <p className={css['notice']}>{t('modelCandidatesFailed')}</p>}
          {visible.length === 0 ? <p className={css['advancedHint']}>{t('noModelCandidates')}</p> : null}
          {!enabled ? <p className={css['notice']}>{t('providerDisabledHint')}</p> : null}
        </>
      ) : null}
      {toast === null ? null : <Toast key={toast.seq} text={toast.text} onDone={() => { setToast(null) }} />}
    </div>
  )
}
