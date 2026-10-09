import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_DSH_HOME_DISPLAY,
  DSH_HOME_DIR_NAME,
  canonicalizeWatchPath,
  defaultDshHome,
  dshCachePath,
  dshHomeDisplay,
  dshHomePath,
  expandHomePath,
  resolveDshHome,
} from '@deepseek-ai/dsh-home-paths'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('dsh path helpers', () => {
  it('owns the shared default DSH home directory name', () => {
    expect(DSH_HOME_DIR_NAME).toBe('.harnova')
    expect(DEFAULT_DSH_HOME_DISPLAY).toBe('~/.harnova')
    expect(defaultDshHome()).toBe(join(homedir(), '.harnova'))
  })

  it('ignores the upstream home even when its environment is inherited', () => {
    const upstream = '/upstream/.dsh'
    expect(resolveDshHome(undefined, { DSH_HOME: upstream })).toBe(defaultDshHome())
    expect(resolveDshHome(undefined, { DSH_HOME: upstream, HARNOVA_HOME: '/fork/.harnova' })).toBe(resolve('/fork/.harnova'))
    expect(resolveDshHome(undefined, { DSH_HOME: upstream, HARNOVA_HOME: ' ' })).toBe(defaultDshHome())
  })

  it('expands tilde paths without changing non-tilde paths', () => {
    expect(expandHomePath('~')).toBe(homedir())
    expect(expandHomePath('~/.harnova')).toBe(join(homedir(), '.harnova'))
    expect(expandHomePath('~\\.harnova')).toBe(join(homedir(), '.harnova'))
    expect(expandHomePath('/tmp/.harnova')).toBe('/tmp/.harnova')
    expect(expandHomePath('~other/.harnova')).toBe('~other/.harnova')
  })

  it('resolves explicit path before HARNOVA_HOME and the default', () => {
    const envHome = join(homedir(), 'env-dsh')

    expect(resolveDshHome('/tmp/explicit-dsh', { HARNOVA_HOME: '~/env-dsh' })).toBe(resolve('/tmp/explicit-dsh'))
    expect(resolveDshHome(undefined, { HARNOVA_HOME: '~/env-dsh' })).toBe(envHome)
    expect(resolveDshHome(undefined, {})).toBe(defaultDshHome())
  })

  it('treats an empty or whitespace-only HARNOVA_HOME as unset', () => {
    expect(resolveDshHome(undefined, { HARNOVA_HOME: '' })).toBe(defaultDshHome())
    expect(resolveDshHome(undefined, { HARNOVA_HOME: '   ' })).toBe(defaultDshHome())
  })

  it('joins child segments onto the resolved HARNOVA_HOME', () => {
    vi.stubEnv('HARNOVA_HOME', '~/env-dsh')
    expect(dshHomePath()).toBe(join(homedir(), 'env-dsh'))
    expect(dshHomePath('storages', 'cache')).toBe(join(homedir(), 'env-dsh', 'storages', 'cache'))
  })

  it('labels a resolved home by whether it is the default root', () => {
    expect(dshHomeDisplay(resolve(defaultDshHome()))).toBe('~/.harnova')
    expect(dshHomeDisplay('/some/other/root')).toBe('$HARNOVA_HOME')
  })

  it.each([
    [undefined, join(homedir(), '.harnova')],
    ['', join(homedir(), '.harnova')],
    ['   ', join(homedir(), '.harnova')],
    ['~/env-dsh', join(homedir(), 'env-dsh')],
    ['./relative-dsh', resolve('./relative-dsh')],
  ] as const)('resolves cache paths with HARNOVA_HOME=%j', (home, expectedHome) => {
    vi.stubEnv('HARNOVA_HOME', home)
    try {
      expect(dshCachePath()).toBe(join(expectedHome, 'cache'))
      expect(dshCachePath('models', 'index.json')).toBe(join(expectedHome, 'cache', 'models', 'index.json'))
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('resolves configured cache homes before the environment', () => {
    vi.stubEnv('HARNOVA_HOME', '~/env-dsh')
    try {
      expect(dshCachePath({ dshHome: '~/explicit-dsh' })).toBe(join(homedir(), 'explicit-dsh', 'cache'))
      expect(dshCachePath({ dshHome: './explicit-dsh' }, 'attachments', 'request-images'))
        .toBe(resolve('./explicit-dsh/cache/attachments/request-images'))
      expect(dshCachePath({}, 'attachments')).toBe(join(homedir(), 'env-dsh', 'cache', 'attachments'))
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('canonicalizes a watcher ancestor while preserving a missing suffix', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-watch-path-'))
    const target = join(root, 'target')
    const alias = join(root, 'alias')
    try {
      await mkdir(target)
      await symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir')
      await expect(canonicalizeWatchPath(alias)).resolves.toBe(await realpath(target))
      await expect(canonicalizeWatchPath(join(alias, 'later', 'config.yml'))).resolves.toBe(
        join(await realpath(target), 'later', 'config.yml'),
      )
      const file = join(root, 'file')
      await writeFile(file, 'not a directory')
      await expect(canonicalizeWatchPath(join(file, 'child'))).rejects.toMatchObject({ code: 'ENOTDIR' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
