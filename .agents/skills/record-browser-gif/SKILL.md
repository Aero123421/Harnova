---
name: record-browser-gif
description: Record an optional browser interaction GIF when requested or when it helps explain a Harnova UI change; publish only when the user requests attachment or upload.
---

# Record Browser GIF

Record a short, truthful demonstration from the intended application's tree. A GIF is optional evidence; UI changes do not require a recording or a real model API call.

## Stage and record

1. Identify the code revision, server origin, profile, viewport, and scenario. Use fresh scratch homes, workspace, and isolated browser state when the flow can mutate them. Never capture credentials or unrelated user data.
2. Use the available browser workflow; use the repository's Playwright dependency if browser control is unavailable. The scenario may use live API, keyless replay, or mock transport depending on the behavior being demonstrated. State which one was used and what the demonstration establishes.
3. Capture one continuous run. Wait for observable readiness or completion rather than a fixed sleep. Keep the viewport consistent and show both the action and its outcome. Failed runs are diagnostics, not frames to splice into a successful run.
4. Save raw capture, recording script, and GIF beneath ignored `.playwright-mcp/`. Stop owned servers and close browser contexts after recording.

## Encode

The bundled [encoder](scripts/encode_gif.py) supports video and screenshot sequences. It requires Python, ffmpeg, and ffprobe. Use an absolute path to this Skill's directory:

```sh
export GIF_SKILL_DIR=/absolute/path/to/record-browser-gif
python3 "$GIF_SKILL_DIR/scripts/encode_gif.py" \
  /absolute/path/to/demo.webm /absolute/path/to/demo.gif \
  --start 2 --end 32 --speed 2 --final-hold 3 --fps 10 --max-width 1200 --colors 128
```

Review the encoded animation, including intermediate frames, readable text, ending, and absence of sensitive content. Disclose trimming or playback speed changes; the GIF does not establish response latency. Return the absolute local artifact path and recording conditions.

## Publish only when requested

Recording itself never changes remote state. Attach or upload only when the user requested publication. Recheck the demonstrated revision against the intended PR before attributing the GIF to it. Use the attachment tool supported by the installed client, then verify the resulting reference. Keep media out of branches that merge into long-lived source branches.

## Encoder maintenance

Run the existing focused tests when changing the encoder:

```sh
python3 -m unittest discover -s "$GIF_SKILL_DIR/scripts" -p 'test_*.py' -v
```
