import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillBadge from '@deepseek-ai/dsh-skill-badge'

describe('dsh-skill-badge', () => {
  it('registers and disposes the bundled badge skill', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(SkillBadge)
    const resourcePath = fileURLToPath(new URL('../assets/', import.meta.url))

    expect(await ctx.skills.list()).toEqual([{
      name: 'dsh-badge',
      description: 'Add a powered-by-Harnova badge when the user requests attribution or a reusable badge asset.',
      invocation: { modelInvocable: true, userInvocable: true },
      provider: 'dsh-badge',
      source: 'bundled',
      resourceBase: { kind: 'directory', path: resourcePath },
    }])
    const loaded = await ctx.skills.get('dsh-badge')
    expect(loaded?.content).toContain('Preserve its aspect ratio')
    expect(loaded?.resourceBase).toEqual({ kind: 'directory', path: resourcePath })

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })

  it('ships the generated 726×120 Harnova PNG', async () => {
    const image = await readFile(new URL('../assets/dsh-badge.png', import.meta.url))
    expect(image.readUInt32BE(16)).toBe(726)
    expect(image.readUInt32BE(20)).toBe(120)
    expect(createHash('sha256').update(image).digest('hex')).toBe(
      '2b0a6f95c3e0daad6b1cf25a38d55ad2658d3c5bff24f53ca0b7ccdbbf769da4',
    )
  })
})
