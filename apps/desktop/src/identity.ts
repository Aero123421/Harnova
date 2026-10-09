/** Establish independent Electron storage before logs, sessions or single-instance ownership. */
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { HARNOVA_APP_NAME } from './desktop-identity.ts'

interface DesktopIdentityApplication {
  setName(name: string): void
  getPath(name: 'appData'): string
  setPath(name: 'userData' | 'sessionData', path: string): void
}

/**
 * Set the shell name and both Electron data roots without reading upstream settings.
 * @param app - Electron application before readiness.
 * @param environment - Harnova-only development or qualification override.
 * @returns the isolated user data directory.
 */
export function initializeDesktopIdentity(app: DesktopIdentityApplication, environment = process.env): string {
  const configured = environment.HARNOVA_DESKTOP_USER_DATA_DIR?.trim()
  const path = configured ? resolve(configured) : join(app.getPath('appData'), HARNOVA_APP_NAME)
  mkdirSync(path, { recursive: true })
  app.setName(HARNOVA_APP_NAME)
  app.setPath('userData', path)
  app.setPath('sessionData', path)
  return path
}
