import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, IconDownloadOutlineRegular, IconEllipsisOutlineRegular, Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { SessionLogDownloadDialog, type SessionLogDownloadDialogProps } from './Dialog.tsx'
import type { SessionLogDownloadDialogInjected } from './Dialog.tsx'
import css from './HeaderAction.module.css'

/** Session download dependencies shared by the menu and dialog. */
export type SessionLogDownloadHeaderInjected = SessionLogDownloadDialogInjected

/** Session download props. */
export type SessionLogDownloadHeaderProps = SessionLogDownloadDialogProps

/**
 * Render the Session Header menu with download action.
 * @param props - Session runtime, download controller, and localized copy.
 * @returns the persistent Header action and Session-scoped dialog.
 */
export function SessionLogDownloadHeaderAction(props: SessionLogDownloadHeaderProps): ReactNode {
  const { sessionId, useSessionLogDownload, request, t } = props
  const entry = useSessionLogDownload(state => state.bySession[String(sessionId)])
  const busy = entry?.status === 'downloading'
  const [open, setOpen] = useState(false)

  return (
    <>
      <Menu
        open={open}
        align="end"
        dense
        onClose={() => { setOpen(false) }}
        items={[
          { id: 'download', label: t('menu.download'), icon: <IconDownloadOutlineRegular />, disabled: busy },
        ]}
        onSelect={() => {
          setOpen(false)
          void request(sessionId)
        }}
        anchor={(
          <Button
            size="sm"
            className={css.moreButton}
            aria-label={t('header.more')}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-busy={busy}
            onClick={() => { setOpen(value => !value) }}
          >
            <IconEllipsisOutlineRegular />
          </Button>
        )}
      />
      <SessionLogDownloadDialog {...props} />
    </>
  )
}
