# ScenePrompter backend

A thin local bridge for the app's "Send to Generator" button — **not** a
multi-tenant API gateway. It shells out to the `higgsfield` CLI, which already
handles its own OAuth and holds its own local token; this server never sees,
stores, or forwards any credential.

## Prerequisites

1. Install the `higgsfield` CLI and authenticate it once, in a terminal:
   ```bash
   higgsfield auth login
   ```
2. Run this server on the **same machine** as that authenticated CLI.

## Run it

```bash
npm install
npm start        # listens on http://localhost:3001 (override with PORT=xxxx)
```

The frontend (`index.html`) talks to it directly at `localhost:3001` — there's
no configuration to point it elsewhere. If the server isn't running, or the
CLI isn't authenticated yet, "Send to Generator" fails with a 401/502 — that's
expected, not a bug.

## Test it

```bash
npm test        # test/buildArgs.test.js
```
