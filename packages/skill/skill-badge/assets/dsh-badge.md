# Harnova Badge

Add a “powered by Harnova” badge when the user requests attribution.

## Assets

- Local PNG: [`dsh-badge.png`](dsh-badge.png), 726×120 source; render at 121×20.
- Remote image: `https://raw.githubusercontent.com/Aero123421/Harnova/main/packages/skill/skill-badge/assets/dsh-badge.png`.
- Project link: `https://github.com/Aero123421/Harnova`.

Use the packaged PNG for documents that cannot import remote images. Preserve its aspect ratio. Place it where the user requests; omit it when attribution is not requested. The existing `dsh-badge` skill name remains available for compatibility.

```markdown
[![Powered by Harnova](https://raw.githubusercontent.com/Aero123421/Harnova/main/packages/skill/skill-badge/assets/dsh-badge.png)](https://github.com/Aero123421/Harnova)
```
