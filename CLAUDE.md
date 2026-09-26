# ScenePrompter

Node-based visual editor that composes a cinematic/product prompt graph and
compiles it to 9 different AI video/image platform dialects. Single-page app:
no build step, no framework, no bundler. Runs by opening `index.html` (or via
the PWA install) — every file is a plain `<script>` tag loaded in a fixed order.

## Run it

```bash
# no server needed — just open index.html, or:
npx serve .              # anything static works
npm test                 # tests/editor.test.js + tests/promptEngine.test.js
```

Optional local backend (only needed for "Send to Generator"):
```bash
cd backend && npm install && npm start   # bridges to an already-authenticated `higgsfield` CLI
```

## Architecture — read this before touching anything

**Script load order matters** (`index.html`): `db.js → subjects.js → materials.js
→ colorpalette.js → contentModules.js → productshot.js → promptEngine.js → app.js`.
Later files call functions/read tables defined in earlier ones. If you add a new
content module, insert its `<script>` tag in this chain, not just at the end.

| File | Owns |
|---|---|
| `js/db.js` | ALL raw data — every dropdown's option list, every preset library (style presets, color palettes, product categories, material types…), plus small pure helpers like `kelvinToRgb`. Adding a dropdown value or a library entry is a `db.js`-only change. |
| `js/subjects.js` | `SUBJECTS` registry — one entry per *positionable scene subject* (animals, insects, birds, vehicles, crowds, VFX, Character/Object equivalents). One entry yields: nav button, node UI, 3D mesh, camera-tracking target, connection rules, prompt output on all 9 platforms, quick-add entry. |
| `js/materials.js` | The Material wrapper node + shared HTML-builder helpers (`sectionHTML`, `fieldHTML`, `rowHTML`) that every later hand-built module reuses. |
| `js/colorpalette.js`, `js/contentModules.js` (UI Elements, Graphic Design), `js/productshot.js` | Hand-built, `customloc`-style nodes: no spatial-context panel, no `mesh()`. Each is "logic only" — its DB arrays live in `db.js`. |
| `js/promptEngine.js` | The pipeline: `collectInputs → buildComposition (neutral clauses) → PLATFORMS[x].build → lintScene → polishPrompt`. Adapters never touch the DOM. |
| `js/app.js` | Everything else: node CRUD (`createNode`, `duplicateNode`, `kill`), cable/drag engine, 3D preview sync, undo/redo, presets, quick-add palette, keyboard shortcuts, minimap, save/load. **2700+ lines, ~100 top-level functions — the one file most in need of splitting up** (see `docs/SYSTEM_ROADMAP.md` Faz 7). |
| `backend/` | A separate, optional Node/Express bridge to the `higgsfield` CLI for real generation. Not required for editing/prompting; only for the one "Send to Generator" button. Has its own `package.json` and test. |

### The unassigned-field contract (the single most important convention)

`''` means *"say nothing about this"*, not "empty value". Every dropdown has an
unassigned option. Helpers `optionsHTML`/`selHTML`/`fieldHTML`/`rowHTML`/`sectionHTML`
build fields that start unassigned unless you pass a default. Every prose clause
in `buildComposition` and every tag in `buildMidjourneyTags` must skip empties —
build with `.filter(Boolean)`, never template a bare `${v.x}` into prose. A
regression here shows up as `"a  wolf"` or `" mood"` or `"wearing "`.

### Adding a new SUBJECT (positioned scene content)

Edit **only** `js/subjects.js` — one `SUBJECTS` entry: `title, nav, prefix, fields,
name, label, phrase, action, audio, tags, mesh`. `phrase(v, spatialString)` /
`action(v)` must tolerate every field being `''`. `mesh(v, THREE)` returns a Group
whose origin is the ground point.

### Adding a new hand-built node (customloc-style: no spatial panel, no mesh)

Follow the `colorpalette.js` / `productshot.js` shape — 6 touch points:
1. Data arrays in `js/db.js`.
2. New module file (or extend an existing one) with `build*HTML`, `read*`,
   `*Phrase`, `*Tags` functions — logic only, no data.
3. `index.html`: `<script>` tag in the right position + a nav button.
4. `js/app.js`: add the type string to `CATEGORIES.<group>.types`; add a
   `createNode` branch (`hasIn`/`hasOut`, `title`, `content = build*HTML(id)`).
5. `js/promptEngine.js`: `collectInputs` (new `g.*` field + switch case),
   `buildComposition` (push the phrase into the right clause — `sArr`/`lit`/`cam`/`sty`),
   `buildMidjourneyTags`.
6. Both test files: add the new source file to their manually-maintained
   `SRC`/`src` eval lists (`tests/promptEngine.test.js`, `tests/editor.test.js`) —
   forgetting this throws `ReferenceError` at test time, not load time.

### Category colours

`CATEGORIES` in `app.js` maps every node type to one of six: source / subject /
light / camera / grade / output. Drives the nav button rail, node header rail,
output socket colour, and quick-add palette grouping — never hand-colour a node.

### Prompt engine shape

`collectInputs` walks the cable graph into one `g` object. `buildComposition`
turns it into **8 neutral clauses** (`shot, subj, act, env, cam, lit, sty, audio`)
with zero platform opinions. Each `PLATFORMS[x].build(c, g)` picks, reorders, and
phrases those clauses for one target model (Runway, Kling, Veo, Luma, Sora, Pika,
Hailuo, Midjourney, Generic — 9 total). New platform = one new `PLATFORMS` entry;
the Stack node's dropdown generates itself from that table. `lintScene(g)` runs
after composition and only ever *warns* (scene/light contradictions, a
Product-Shot-vs-Camera optics conflict, etc.) — it never blocks generation.

**A clause can have more than one contributor.** E.g. `lit` is built from a
`litParts` array that both Light nodes *and* a connected Product Shot node push
into — if you add a node that should speak into an existing clause, extend that
array/join pattern rather than writing a second, competing clause.

## Testing

`npm test` runs both suites (currently 360+ assertions, zero framework — plain
Node scripts driving jsdom). See `tests/README.md` for the two files' scope.
Key facts that bite people:
- `const` bindings do **not** leak out of the tests' `eval(...)` — the top of
  each test file re-exports `SUBJECTS`/`DB`/`PLATFORMS`/etc. explicitly.
  Function *declarations* do leak automatically.
- Both test files hardcode the list of source files to `eval` together
  (`SRC` in `promptEngine.test.js`, `src` in `editor.test.js`). **A new
  `js/*.js` module must be added to both lists.**
- `jsdom` has no `THREE` — 3D mesh code is untested; only "does the node mount
  with the right DOM ids" is checked for registry/module nodes.
- Prompt-engine tests are text **snapshots** — if a refactor changes wording,
  update the expected string deliberately; don't chase the test into passing
  by accident.

## Visual verification (catches what jsdom cannot)

```bash
chrome --headless=new --disable-gpu --enable-unsafe-swiftshader --no-sandbox \
  --virtual-time-budget=9000 --window-size=1500,880 --screenshot=out.png \
  "file:///C:/Works/Projects/ScenePrompter/index.html"
```
Then read the PNG. Chrome headless has a **~512px minimum window width** —
`--window-size=430` silently renders at 512 and crops (looks exactly like a
horizontal-overflow bug). Measure `document.documentElement.scrollWidth` before
trusting a layout complaint. rAF does not tick under `--virtual-time-budget`
(the screenshot path still forces one paint), and `ResizeObserver` fires once
on `.observe()` then goes quiet — the 3D preview resizes itself in the render
loop by polling `clientWidth/Height`, specifically to survive this.

## Known deliberate quirks / non-obvious behaviour

- Duplicating a node uses `createNode(type)` + `copyNodeValues` on a
  `setTimeout(0)` (light/camera panels finish init on a timeout) — never clone
  `innerHTML` and regex-rewrite ids (a past bug: `${id}` inside a regex
  *literal* matches nothing).
- Veo capitalises only `compEnv`, so with no scene/location node its line opens
  lowercase — intentional, not a bug.
- Save/load is one localStorage key (`scene_save`), auto-restored on boot. No
  multi-project slots yet (`docs/SYSTEM_ROADMAP.md` Faz 5).
- The `feat/product-shot-module` branch is not yet merged to `main` as of this
  writing — check `git log main..HEAD` before assuming Product Shot is live for
  the user.

## Docs

`docs/SYSTEM_ROADMAP.md` — phased roadmap (written mid-July, now partly stale:
several "not done" items have since shipped — verify against code before
trusting a status in there). `docs/STYLE_LIBRARY_AND_MODULES_PLAN.md` and
`docs/PRODUCT_SHOT_MODULE_PLAN.md` — as-built design notes for specific modules,
each a good template for writing up the next one.
