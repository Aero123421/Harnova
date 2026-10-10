/** Shipped browser composition sends model requests without additional telemetry. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { expect, it, onTestFinished } from 'vitest'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { startMockLlmServer } from '@deepseek-ai/dsh-llm-mock-server'
import { launchWebScaffold, webSnapshotMode } from './scaffold.ts'
import { connectFreshWorkspace, newEnglishPage, openSettings } from './support.ts'

it.skipIf(webSnapshotMode() === 'record')('keeps additional logs and tracking absent before and after a browser reload', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-upload-browser-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const server = await startMockLlmServer({ sequence: ['success', 'success', 'success'], successText: 'UPLOAD_SETTING_DONE' })
  onTestFinished(() => server.close())
  const key = credentialRef('DSH_UPLOAD_BROWSER_KEY')
  const overlay = join(root, 'upload.yml')
  await writeFile(overlay, JSON.stringify([
    { id: 'llm-deepseek', config: { baseURL: server.baseURL, apiKeyEnv: key, models: [{ id: 'deepseek-v4-flash' }] } },
    { id: 'agent-default-model', config: { provider: 'deepseek-official', model: 'deepseek-v4-flash' } },
  ]))
  const scaffold = await launchWebScaffold({ deepSeekMissingCredential: true, extraOverlayPath: overlay })
  onTestFinished(() => scaffold.close())
  await scaffold.ctx.credentials.set(key, 'upload-browser-test-key')
  const browser = await chromium.launch()
  onTestFinished(() => browser.close())
  const page = await newEnglishPage(browser)
  await page.goto(scaffold.authenticatedUrl)
  await connectFreshWorkspace(page, scaffold.workspaceCwd)
  const input = page.locator('[data-composer-input]').first()
  const send = async (text: string) => {
    const settled = scaffold.whenTurnSettled()
    await input.fill(text)
    await input.press('Enter')
    return settled
  }
  await openSettings(page, 'en')
  expect(await page.getByRole('switch', { name: 'Upload Session Log when using the official model API' }).count()).toBe(0)
  await page.keyboard.press('Escape')

  const sessionId = await send('privacy-before-reload')
  expect(server.requests).toHaveLength(1)
  await page.reload({ waitUntil: 'load' })
  await page.getByText('UPLOAD_SETTING_DONE', { exact: true }).waitFor()
  expect(await send('privacy-after-reload')).toBe(sessionId)
  expect(server.requests).toHaveLength(2)
  for (const request of server.requests) {
    expect(request.body).not.toHaveProperty('dsh_session_log')
    expect(request.body).not.toHaveProperty('dsh_plugin_packages')
    for (const name of ['x-deepseek-harness-user-id', 'x-deepseek-harness-session-id', 'x-deepseek-harness-compact']) {
      expect(request.headers).not.toHaveProperty(name)
    }
    expect(request.headers['x-api-key']).toBe('upload-browser-test-key')
  }
  expect(server.requests.map(request => request.outcome)).toEqual(['completed', 'completed'])
})
