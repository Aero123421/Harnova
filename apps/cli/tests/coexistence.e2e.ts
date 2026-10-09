/** Real CLI composition must ignore upstream home overrides and user configuration. */
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { expect, it } from 'vitest'
import { resolveExampleLaunch } from '@deepseek-ai/dsh-loader-smoke'

it('composes only Harnova profiles and home patches while preserving upstream data', { timeout: 45_000, retry: 0 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'harnova-coexistence-'))
  try {
    const upstream = join(root, '.dsh')
    const own = join(root, '.harnova')
    for (const home of [upstream, own]) {
      const profile = join(home, 'profiles', 'coexistence')
      await mkdir(profile, { recursive: true })
      await writeFile(join(profile, 'package.json'), JSON.stringify({ private: true, dsh: { profile: { bundles: [] } } }))
      await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
    }
    const sentinels = { 'cordis.patch.yml': 'invalid: [upstream configuration',
      '.credentials.yaml': 'upstream credential sentinel', 'AGENTS.md': 'upstream instructions' }
    for (const [path, bytes] of Object.entries(sentinels)) await writeFile(join(upstream, path), bytes)
    await writeFile(join(own, 'cordis.patch.yml'), '- insert:\n    - id: harnova-only\n      name: harnova-test-marker\n')
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(DSH_|HARNOVA_|NODE_OPTIONS$|NODE_PATH$)/i.test(key) && !/KEY|SECRET|TOKEN|PASSWORD/i.test(key)))
    const launch = resolveExampleLaunch({
      srcBin: fileURLToPath(new URL('../src/bin.ts', import.meta.url)),
      tsconfigPath: fileURLToPath(new URL('../../../tsconfig.json', import.meta.url)),
      sourceImport: 'tsx/esm',
      configArgs: ['--profile', 'coexistence', '--dump-config'],
    })
    const run = (override?: string) => execa(launch.command, launch.args, {
      cwd: root, extendEnv: false,
      env: { ...environment, ...launch.env, HOME: root, USERPROFILE: root, DSH_HOME: upstream,
        HARNOVA_HOME: override, DSH_TELEMETRY_DISABLED: '1' },
      input: '', timeout: 30_000, killSignal: 'SIGKILL',
    })
    for (const override of [undefined, own]) {
      const result = await run(override)
      expect(result.stdout).toContain('harnova-test-marker')
      expect(result.stdout).toContain(join(own, 'cordis.patch.yml'))
      expect(result.stdout).not.toContain(upstream)
    }
    for (const [path, bytes] of Object.entries(sentinels)) expect(await readFile(join(upstream, path), 'utf8')).toBe(bytes)
    expect((await readdir(upstream)).sort()).toEqual(['.credentials.yaml', 'AGENTS.md', 'cordis.patch.yml', 'profiles'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
