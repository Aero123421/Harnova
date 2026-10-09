import { HarnovaMark } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ChatView.module.css'

/** Decorative vector mark; CSS pauses its pulse for reduced motion and forced colors. */
export function RunningBrandMark() {
  return <span className={css.runningIcon} aria-hidden="true"><HarnovaMark size={14} className={css.runningBrandMark} /></span>
}
