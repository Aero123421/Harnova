import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
const binScript = fileURLToPath(new URL('./fixtures/dsh-badge/snapshot.ts', import.meta.url))
const configPath = fileURLToPath(new URL('./fixtures/dsh-badge/cordis.yml', import.meta.url))
const defaultConfigPath = fileURLToPath(new URL('./fixtures/dsh-badge/default.cordis.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))
const badgeAssetsPath = fileURLToPath(new URL('../../../packages/skill/skill-badge/assets/', import.meta.url))

describe('dsh badge assembled snapshot', () => {
  it('advertises and loads the opt-in bundled skill through the shipped app', async () => {
    const disabled = await runLoaderSmoke({
      label: 'disabled dsh badge skill snapshot',
      tempDirPrefix: 'headless-snapshot-dsh-badge-disabled-',
      binScript,
      libBinScript: binScript,
      configPath: defaultConfigPath,
      tsconfigPath,
    })
    const enabled = await runLoaderSmoke({
      label: 'dsh badge skill snapshot',
      tempDirPrefix: 'headless-snapshot-dsh-badge-',
      binScript,
      libBinScript: binScript,
      configPath,
      tsconfigPath,
    })
    const disabledSnapshot: unknown = JSON.parse(disabled.stdout)
    const enabledSnapshot: unknown = JSON.parse(
      enabled.stdout.replaceAll(badgeAssetsPath, '{{badgeAssetsPath}}'),
    )

    expect(disabled.stderr).toBe('')
    expect(enabled.stderr).toBe('')
    expect(disabledSnapshot).toMatchInlineSnapshot(`
      {
        "catalog": null,
        "result": {
          "content": [
            {
              "text": "Error: skill "dsh-badge" is unknown or no longer available",
              "type": "text",
            },
          ],
          "error": {
            "message": "skill "dsh-badge" is unknown or no longer available",
          },
          "isError": true,
        },
        "summary": null,
      }
    `)
    expect(enabledSnapshot).toMatchInlineSnapshot(`
      {
        "catalog": [
          {
            "text": "<system-reminder>
      A skill is a reusable set of task-specific instructions. The following skills are available in this session:

      <available_skills>
      - \`dsh-badge\`: Add a powered-by-Harnova badge when the user requests attribution or a reusable badge asset.
      </available_skills>

      If the user names a skill, or the task clearly matches a skill's description, call the \`skill\` tool with the exact skill name before taking task actions. Load all applicable skills, then follow their full instructions. This catalog contains summaries only; do not infer or follow a skill's instructions until it has been loaded.
      A user may also invoke a skill directly; its <skill_content> block then appears in this conversation. Follow it, and do not call the \`skill\` tool again for that skill.
      </system-reminder>",
            "type": "text",
          },
        ],
        "result": {
          "content": [
            {
              "text": "<skill_content name="dsh-badge">
      <skill_resources>
      Base directory for this skill: {{badgeAssetsPath}}
      Resolve relative paths mentioned by this skill against the base directory before using them. Load referenced resources only as needed.
      </skill_resources>

      <skill_instructions>
      # Harnova Badge

      Add a “powered by Harnova” badge when the user requests attribution.

      ## Assets

      - Local PNG: [\`dsh-badge.png\`](dsh-badge.png), 726×120 source; render at 121×20.
      - Remote image: \`https://raw.githubusercontent.com/Aero123421/Harnova/main/packages/skill/skill-badge/assets/dsh-badge.png\`.
      - Project link: \`https://github.com/Aero123421/Harnova\`.

      Use the packaged PNG for documents that cannot import remote images. Preserve its aspect ratio. Place it where the user requests; omit it when attribution is not requested. The existing \`dsh-badge\` skill name remains available for compatibility.

      \`\`\`markdown
      [![Powered by Harnova](https://raw.githubusercontent.com/Aero123421/Harnova/main/packages/skill/skill-badge/assets/dsh-badge.png)](https://github.com/Aero123421/Harnova)
      \`\`\`

      </skill_instructions>
      </skill_content>",
              "type": "text",
            },
          ],
          "isError": false,
          "value": {
            "content": "# Harnova Badge

      Add a “powered by Harnova” badge when the user requests attribution.

      ## Assets

      - Local PNG: [\`dsh-badge.png\`](dsh-badge.png), 726×120 source; render at 121×20.
      - Remote image: \`https://raw.githubusercontent.com/Aero123421/Harnova/main/packages/skill/skill-badge/assets/dsh-badge.png\`.
      - Project link: \`https://github.com/Aero123421/Harnova\`.

      Use the packaged PNG for documents that cannot import remote images. Preserve its aspect ratio. Place it where the user requests; omit it when attribution is not requested. The existing \`dsh-badge\` skill name remains available for compatibility.

      \`\`\`markdown
      [![Powered by Harnova](https://raw.githubusercontent.com/Aero123421/Harnova/main/packages/skill/skill-badge/assets/dsh-badge.png)](https://github.com/Aero123421/Harnova)
      \`\`\`
      ",
            "name": "dsh-badge",
            "provider": "dsh-badge",
            "resourceBase": {
              "kind": "directory",
              "path": "{{badgeAssetsPath}}",
            },
          },
        },
        "summary": {
          "description": "Add a powered-by-Harnova badge when the user requests attribution or a reusable badge asset.",
          "invocation": {
            "modelInvocable": true,
            "userInvocable": true,
          },
          "name": "dsh-badge",
          "provider": "dsh-badge",
          "resourceBase": {
            "kind": "directory",
            "path": "{{badgeAssetsPath}}",
          },
          "source": "bundled",
        },
      }
    `)
  }, LOADER_SMOKE_TEST_TIMEOUT_MS * 2)
})
