/** Electron storage ownership is established before any app state is opened. */
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { initializeDesktopIdentity } from '../src/identity.ts'

it('uses independent Electron data and leaves the upstream directory untouched', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harnova-identity-'))
  try {
    const upstream = join(root, '@deepseek-ai', 'dsh-desktop')
    await mkdir(upstream, { recursive: true })
    await writeFile(join(upstream, 'Preferences'), 'upstream preferences')
    const paths = new Map<string, string>()
    let name = ''
    const app = { getPath: () => root, setName: (value: string) => { name = value },
      setPath: (key: string, value: string) => { paths.set(key, value) } }
    const home = initializeDesktopIdentity(app, { DSH_DESKTOP_USER_DATA_DIR: upstream })
    expect(home).toBe(join(root, 'Harnova'))
    expect(name).toBe('Harnova')
    expect(paths.get('userData')).toBe(home)
    expect(paths.get('sessionData')).toBe(home)
    expect(await readdir(home)).toEqual([])
    expect(await readFile(join(upstream, 'Preferences'), 'utf8')).toBe('upstream preferences')
    const development = join(root, 'development')
    expect(initializeDesktopIdentity(app, { HARNOVA_DESKTOP_USER_DATA_DIR: development })).toBe(development)
    expect(paths.get('userData')).toBe(development)
    expect(paths.get('sessionData')).toBe(development)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
