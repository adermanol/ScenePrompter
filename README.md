# ScenePrompter — AI Video Artist OS

A node-based visual editor that composes a cinematic (or product-shot) prompt
graph and compiles it to 9 different AI video/image platform dialects: Runway,
Kling, Veo, Luma, Sora, Pika, Hailuo, Midjourney, and a Generic tagged export.

No build step, no framework, no bundler — every file is a plain `<script>` tag.

## Run it

```bash
# just open index.html in a browser — that's the whole app.
# or serve it statically if you prefer:
npx serve .
```

It's an installable PWA (works offline once loaded once) — look for your
browser's "Install" prompt.

## Test it

```bash
npm install     # one dev dependency: jsdom
npm test        # tests/editor.test.js + tests/promptEngine.test.js
```

See `tests/README.md` for what each suite actually locks down.

## Optional: real generation ("Send to Generator")

The Stack node's "Send to Generator" button talks to a small local bridge
server, not a cloud API:

```bash
cd backend
npm install
npm start        # bridges to an already-authenticated `higgsfield` CLI, localhost:3001
```

Everything else — building prompts, every node type, save/load, presets — works
with no backend at all.

## Where things live

- **`CLAUDE.md`** — architecture map for anyone (human or agent) making changes:
  script load order, the node-authoring patterns, the prompt engine pipeline,
  testing gotchas. Read this before touching `js/*.js`.
- **`docs/`** — as-built design notes for individual modules
  (`PRODUCT_SHOT_MODULE_PLAN.md`, `STYLE_LIBRARY_AND_MODULES_PLAN.md`), the
  phased roadmap (`SYSTEM_ROADMAP.md`), and periodic whole-codebase reviews
  (`PROJECT_ANALYSIS_2026-09.md`).
- **`backend/`** — the optional generator bridge, its own `package.json` and test.
