/** Common rendering for registered provider login notices and prompts. */
import { useEffect, useState } from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { LoginSnapshot } from './login-store.ts'
import type { en } from './locales.ts'
import css from './ModelsSection.module.css'

/** Only transient form input lives in this component. */
export function ModelsLoginDialog({ state, answer, close, t }: {
  state: LoginSnapshot
  answer: (id: number, value: string) => void
  close: () => void
  t: (key: keyof typeof en) => string
}) {
  const [value, setValue] = useState('')
  useEffect(() => { setValue('') }, [state.prompt?.id, state.provider])
  const prompt = state.prompt
  // Provider URLs are rendered as links only for web schemes.
  const url = state.notice?.url
  const safeUrl = url !== undefined && /^https?:\/\//i.test(url) ? url : undefined
  return (
    <Modal open={state.provider !== null} onClose={close} title={t('providerLoginTitle').replace('{provider}', state.provider ?? '')}
      closeLabel={t('close')} footer={<Button variant="outline" onClick={close}>{t(state.phase === 'waiting' ? 'cancel' : 'close')}</Button>}>
      <div className={css['modelAccess']}>
        {state.phase !== 'waiting' ? <p role="status">{t(state.phase === 'authorized' ? 'providerLoginSuccess' : state.phase === 'failed' ? 'providerLoginFailed' : 'providerLoginCancelled')}</p> : null}
        {state.phase === 'waiting' && prompt === null && state.notice === null ? <p role="status">{t('providerLoginWaiting')}</p> : null}
        {state.notice === null ? null : <p role="status">{state.notice.message}</p>}
        {safeUrl === undefined ? null : <a href={safeUrl} target="_blank" rel="noopener noreferrer">{t('providerLoginOpenBrowser')}</a>}
        {state.notice?.code === undefined ? null : <code>{state.notice.code}</code>}
        {prompt === null ? null : (
          <form onSubmit={(event) => { event.preventDefault(); if (value.length > 0) { answer(prompt.id, value); setValue('') } }} className={css['modelAccess']}>
            <label htmlFor={`provider-login-${prompt.id}`}>{prompt.message}</label>
            {prompt.kind === 'select'
              ? <select id={`provider-login-${prompt.id}`} className={`${css['input']} ${css['selectInput']}`} value={value} onChange={(event) => { setValue(event.target.value) }}>
                <option value="">{t('providerLoginChoose')}</option>
                {prompt.options?.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              : <Input id={`provider-login-${prompt.id}`} type={prompt.kind === 'secret' ? 'password' : 'text'} value={value}
                autoComplete="off" spellCheck={false} placeholder={prompt.placeholder} onChange={(event) => { setValue(event.target.value) }} />}
            <Button type="submit" disabled={value.length === 0}>{t('providerLoginContinue')}</Button>
          </form>
        )}
      </div>
    </Modal>
  )
}
