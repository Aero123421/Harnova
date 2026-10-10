/** Discrete adapter-owned effort levels; dragging never floods selection RPCs. */
import { useRef, useState } from 'react'
import type { ModelReasoning } from '@deepseek-ai/dsh-api-remotes/client'
import css from './ModelSelect.module.css'

/** Undefined is the provider default, distinct from the first effort level. */
export function EffortSlider({ reasoning, value, disabled, label, defaultLabel, commit }: {
  reasoning: ModelReasoning
  value: string | undefined
  disabled: boolean
  label: string
  defaultLabel: string
  commit: (value: string | undefined) => void
}) {
  const [preview, setPreview] = useState<number | null>(null)
  const pending = useRef<number | null>(null)
  const effective = value ?? reasoning.defaultEffort
  const selected = reasoning.efforts.findIndex(level => level.id === effective)
  const index = preview ?? Math.max(0, selected)
  const choice = reasoning.efforts[index]
  const settle = (): void => {
    const next = pending.current
    pending.current = null
    setPreview(null)
    if (next === null) return
    const level = reasoning.efforts[next]
    if (level !== undefined && level.id !== effective) commit(level.id)
  }
  return (
    <div className={css.effortSlider}>
      <div className={css.effortSliderHead}>
        <span>{label}</span>
        <span>{preview !== null ? choice?.name : selected < 0 ? defaultLabel : choice?.name}</span>
      </div>
      {reasoning.efforts.length > 1 ? <input type="range" min={0} max={reasoning.efforts.length - 1} step={1}
        value={index} disabled={disabled} aria-label={label}
        aria-valuetext={preview !== null || selected >= 0 ? choice?.name : defaultLabel}
        onChange={(event) => { const next = Number(event.target.value); pending.current = next; setPreview(next) }}
        onPointerDown={(event) => {
          pending.current = Number(event.currentTarget.value)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerUp={settle} onPointerCancel={() => { pending.current = null; setPreview(null) }}
        onKeyUp={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
            pending.current ??= Number(event.currentTarget.value)
            settle()
          }
        }}
        onBlur={settle} /> : choice === undefined ? null : <button type="button" className={css.retry} disabled={disabled}
        onClick={() => { commit(choice.id) }}>{choice.name}</button>}
      {value === undefined ? null : <button type="button" className={css.retry} disabled={disabled}
        onClick={() => { commit(undefined) }}>{defaultLabel}</button>}
    </div>
  )
}
