import { readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'

let scaffold: WebScaffold
let browser: Browser
let page: Page
const master = await readFile(new URL('../../../assets/branding/harnova-mark.svg', import.meta.url), 'utf8')
const approvedPaths = [...master.matchAll(/<path\b[^>]*\bd="([^"]+)"/gu)].map(match => match[1])

beforeAll(async () => {
  scaffold = await launchWebScaffold({ developerTools: false })
  browser = await chromium.launch()
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US' })
  await page.goto(scaffold.authenticatedUrl, { waitUntil: 'load' })
  await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await scaffold?.close()
})

it('renders the approved paths in the real sidebar and hero in both themes', async () => {
  const marks = page.locator('svg[viewBox="32 32 192 192"]')
  await expect.poll(() => marks.count()).toBeGreaterThanOrEqual(2)
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await expect.poll(() => page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme'))).toBe(scheme === 'dark')
    const rendered = await marks.evaluateAll(elements => elements.map(svg => ({
      paths: [...svg.querySelectorAll('path')].map(path => path.getAttribute('d')),
      color: getComputedStyle(svg).color,
      animated: svg.querySelector('animate') !== null,
    })))
    expect(rendered.every(mark => JSON.stringify(mark.paths) === JSON.stringify(approvedPaths))).toBe(true)
    expect(rendered.every(mark => !mark.animated)).toBe(true)
    const channels = rendered[0]?.color.match(/\d+/gu)?.map(Number) ?? []
    expect(channels.length).toBeGreaterThanOrEqual(3)
    expect(channels[0]).toBeGreaterThanOrEqual(scheme === 'dark' ? 180 : 0)
    expect(channels[0]).toBeLessThanOrEqual(scheme === 'light' ? 80 : 255)
    expect(await page.locator('svg[viewBox="0 0 23.16 17.04"]').count()).toBe(0)
    const capture = process.env.HARNOVA_BRAND_CAPTURE_DIR
    if (capture !== undefined) {
      await mkdir(capture, { recursive: true })
      await page.screenshot({ path: join(capture, `app-${scheme}.png`) })
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await marks.first().evaluate(svg => getComputedStyle(svg).animationName)).toBe('none')
})

it('serves Harnova favicons and install metadata from the built application', async () => {
  for (const name of ['favicon.svg', 'favicon-dark.svg']) {
    const response = await page.request.get(new URL(name, scaffold.baseUrl).href)
    expect(response.ok()).toBe(true)
    const paths = [...(await response.text()).matchAll(/<path\b[^>]*\bd="([^"]+)"/gu)].map(match => match[1])
    expect(paths).toEqual(approvedPaths)
  }
  const manifest = await page.request.get(new URL('manifest.webmanifest', scaffold.baseUrl).href)
  expect(await manifest.json()).toMatchObject({ name: 'Harnova', short_name: 'Harnova' })
  expect(await page.title()).toContain('Harnova')
})
