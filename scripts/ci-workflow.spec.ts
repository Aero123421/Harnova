import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

const workflowDirectory = resolve(import.meta.dirname, '../.github/workflows')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError('Expected a workflow mapping')
  return value
}

function workflow(name: string): Record<string, unknown> {
  return record(yaml.load(readFileSync(resolve(workflowDirectory, name), 'utf8')))
}

function jobs(name: string): Record<string, unknown> {
  return record(workflow(name).jobs)
}

function commands(job: unknown): string[] {
  const steps = record(job).steps
  if (!Array.isArray(steps)) throw new TypeError('Expected workflow steps')
  return steps.map(record).flatMap(step => typeof step.run === 'string' ? [step.run] : [])
}

const automatic = ['ci.yml', 'sandbox.yml', 'node-addon-system.yml', 'release.yml']
const manual = ['e2e.yml', 'pi-ai-provider-e2e.yml', 'build-exe-for-python-sdk.yml', 'draft-release.yml']

describe('Harnova continuous integration', () => {
  it.each(automatic)('%s checks pull requests and main pushes without credentials', (name) => {
    const config = workflow(name)
    const events = record(config.on)
    expect(events).toHaveProperty('pull_request')
    expect(record(events.push).branches).toEqual(['main'])
    expect(events).toHaveProperty('workflow_dispatch')
    expect(config.permissions).toEqual({ contents: 'read' })
    expect(JSON.stringify(config)).not.toMatch(/secrets\.|pull_request_target|workflow_run|self-hosted|blacksmith|dsh-ubuntu|dsh-windows/)
    expect(config.concurrency).toEqual({
      group: '${{ github.workflow }}-${{ github.ref }}',
      'cancel-in-progress': true,
    })
  })

  it('keeps type, coverage, snapshot, artifact, and performance checks on Linux', () => {
    const linux = record(jobs('ci.yml').linux)
    expect(linux['runs-on']).toBe('ubuntu-24.04')
    const matrix = record(record(linux.strategy).matrix)
    expect(matrix.suite).toEqual(expect.arrayContaining(['static', 'coverage', 'consumers', 'bench']))
    expect(commands(linux)).toContain('pnpm run typecheck')
    expect(commands(linux)).toContain('pnpm run check:ci:${{ matrix.suite }}')
    expect(commands(linux).join('\n')).toContain('playwright install --with-deps chromium webkit')
  })

  it('builds and tests Windows and macOS on native hosted runners', () => {
    const native = record(jobs('ci.yml').native)
    const matrix = record(record(native.strategy).matrix)
    expect(matrix.os).toEqual(expect.arrayContaining(['windows-2025', 'macos-latest']))
    expect(native['runs-on']).toBe('${{ matrix.os }}')
    expect(commands(native)).toContain('pnpm run build')
    expect(commands(native)).toContain('pnpm run test --maxWorkers=2')
    const steps = native.steps
    if (!Array.isArray(steps)) throw new TypeError('Expected native steps')
    const windowsChecks = steps.map(record).find(step => typeof step.run === 'string' && step.run.includes('packages/shell/tool-pwsh/tests/loader.spec.ts'))
    expect(windowsChecks?.shell).toBe('pwsh')
    expect(windowsChecks?.if).toBe("runner.os == 'Windows'")
  })

  it('checks source launch on the engine floor and both Node loader generations', () => {
    const compatible = record(jobs('ci.yml')['node-compat'])
    expect(record(record(compatible.strategy).matrix).node).toEqual(['22.19', '24.9', '26'])
    expect(commands(compatible)).toContain('pnpm run check:node-compat')
    expect(commands(compatible).join('\n')).toContain('loader-shape.compat.spec.ts')
  })

  it('fails the aggregate when any required platform fails or skips', () => {
    const verdict = record(jobs('ci.yml')['all-checks-passed'])
    expect(verdict.needs).toEqual(expect.arrayContaining(['linux', 'native', 'node-compat', 'python-sdk']))
    expect(verdict.if).toBe('${{ !cancelled() }}')
    const script = commands(verdict).join('\n')
    expect(script).toContain("'success,success,success,success'")
    expect(script).toContain('exit 1')
  })

  it('retains real kernel confinement checks and rejects skipped platform proofs', () => {
    const sandbox = record(jobs('sandbox.yml')['sandbox-e2e'])
    const matrix = record(record(sandbox.strategy).matrix)
    expect(matrix.include).toEqual(expect.arrayContaining([
      { os: 'ubuntu-latest', runner: 'bwrap' },
      { os: 'ubuntu-24.04', runner: 'landlock' },
      { os: 'ubuntu-24.04-arm', runner: 'landlock' },
      { os: 'macos-latest', runner: 'seatbelt' },
    ]))
    const script = commands(sandbox).join('\n')
    expect(script).toContain('pnpm --dir native/system run build:native')
    expect(script).toContain('packages/sandbox/sandbox-local/tests/${{ matrix.runner }}.e2e.ts')
    expect(script).toContain('2 passed \\(2\\)')
    expect(script).toContain('packed-install.e2e.ts')
  })

  it.skipIf(process.platform === 'win32')('fails confinement checks when the test process fails despite a passing-file summary', () => {
    const scripts = commands(jobs('sandbox.yml')['sandbox-e2e'])
      .filter(script => script.includes('out=$(pnpm exec vitest'))
    expect(scripts).toHaveLength(2)
    for (const script of scripts) {
      const stub = "pnpm() { printf 'Test Files  2 passed (2)\\nTest Files  1 passed (1)\\n'; return 1; }"
      const result = spawnSync('bash', ['-c', `${stub}\n${script}`], { encoding: 'utf8' })
      expect(result.status, result.stderr).toBe(1)
    }
  })

  it('checks local packed installations without publishing to a registry', () => {
    const scripts = commands(jobs('release.yml').pack).join('\n')
    expect(scripts).toContain('release:verify-packed-install --family dsh')
    expect(scripts).toContain('release:verify-packed-install --family vendor')
    expect(scripts).not.toContain('release:publish')
    expect(scripts).not.toContain('npm publish')
  })

  it.each(manual)('%s requires an explicit manual run', (name) => {
    expect(Object.keys(record(workflow(name).on))).toEqual(['workflow_dispatch'])
    expect(workflow(name).permissions).toEqual({ contents: 'read' })
  })

  it('keeps runtime wheel smokes keyless', () => {
    const builder = workflow('build-exe-for-python-sdk.yml')
    expect(JSON.stringify(builder)).not.toMatch(/secrets\.|sdk-live|inputs\.ci|inputs\.release/)
    const scripts = commands(jobs('build-exe-for-python-sdk.yml').build).join('\n')
    expect(scripts).toContain('smoke-python-runtime.py')
    expect(scripts).toContain('--installed-wheel')
    expect(scripts).toContain('--scenario all')
  })

  it('uses the operator-provided Azure endpoint', () => {
    const provider = workflow('pi-ai-provider-e2e.yml')
    const inputs = record(record(record(provider.on).workflow_dispatch).inputs)
    expect(record(inputs.azure_openai_base_url).required).toBe(true)
    expect(JSON.stringify(provider)).not.toContain('openai-routerhub-resource')
    expect(JSON.stringify(provider)).toContain('${{ inputs.azure_openai_base_url }}')
  })

  it('creates only an explicitly requested GitHub draft after local installation checks', () => {
    const config = workflow('draft-release.yml')
    expect(config.permissions).toEqual({ contents: 'read' })
    const build = record(jobs('draft-release.yml').build)
    const publisher = record(jobs('draft-release.yml').draft)
    expect(build.permissions).toBeUndefined()
    expect(publisher.permissions).toEqual({ contents: 'write' })
    expect(publisher.needs).toBe('build')
    expect(commands(build)).toContain('pnpm run build:official')
    const checks = commands(build).join('\n')
    expect(checks).toContain('git merge-base --is-ancestor')
    expect(checks).toContain('refs/remotes/origin/main')
    expect(checks).toContain('Aero123421/Harnova')
    expect(checks).toContain('release:verify-packed-install --family dsh')
    expect(checks).toContain('--current-platform-only')
    const publishing = commands(publisher).join('\n')
    expect(publishing).toContain('--repo Aero123421/Harnova --verify-tag')
    expect(publishing).toContain('--draft')
    expect(publishing).toContain('--notes-file release-notes.md')
    expect(publishing).toContain('Tag moved after the build')
    expect(JSON.stringify(config)).not.toMatch(/NPM_TOKEN|release:publish|pypi-publish/)
  })

  it.skipIf(process.platform === 'win32')('rejects invalid release tags and tags outside main before running build scripts', () => {
    const validate = commands(jobs('draft-release.yml').build)[0]
    if (validate === undefined) throw new Error('Missing release tag validation')
    const environment = { ...process.env, REPOSITORY: 'Aero123421/Harnova', WORKFLOW_REF: 'refs/heads/main' }
    for (const tag of ['v1.2.3;touch injected', '../main', 'v1.2']) {
      const result = spawnSync('bash', ['-c', validate], { encoding: 'utf8', env: { ...environment, TAG: tag } })
      expect(result.status, result.stderr).toBe(1)
      expect(result.stdout).toContain('Tag must have the form')
    }
    const stub = 'git() { if [[ "$1" == rev-parse ]]; then echo aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; else return 1; fi; }'
    const outsideMain = spawnSync('bash', ['-c', `${stub}\n${validate}`], { encoding: 'utf8', env: { ...environment, TAG: 'v1.2.3' } })
    expect(outsideMain.status, outsideMain.stderr).toBe(1)
  })

  it('contains no upstream publishing, project, review, or preview automation', () => {
    const names = readdirSync(workflowDirectory).filter(name => name.endsWith('.yml'))
    expect(names.sort()).toEqual([...automatic, ...manual].sort())
    for (const name of names.filter(name => name !== 'draft-release.yml')) {
      const config = workflow(name)
      const removedAutomation = /deepseek-harness\/deepseek-harness|DSH_CI_FAILOVER|Cloudflare|statuses.*write|pages.*write|id-token.*write/
      expect(JSON.stringify(config)).not.toMatch(removedAutomation)
    }
  })
})
