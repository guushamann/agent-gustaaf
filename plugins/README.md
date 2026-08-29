# AI Harness UI Plugins

Each plugin is a self-contained frontend that talks to the AI harness through its HTTP API. Plugins do not share code with the harness, so they can be built, replaced, and extended independently.

## Conventions

- Create a new directory under `plugins/<plugin-name>/`.
- Each plugin owns its `package.json`, build tooling, and dev server.
- Plugins communicate with the harness via:
  - `GET /api/threads/:threadId/stream` — Server-Sent Events stream
  - `POST /api/threads/:threadId/respond` — Submit a user message or answer
- During development, proxy `/api` to the harness (running on `http://localhost:3000` by default).

## Existing Plugins

### `debug-ui`
A minimal chat-style debugger for inspecting harness threads.

```bash
cd plugins/debug-ui
npm install
npm run dev
```

Then open the Vite URL (usually `http://localhost:5173`), enter a thread ID, and connect.

## Adding a New Plugin

1. Copy `plugins/debug-ui/` as a starting point.
2. Update `name` in `package.json`.
3. Replace the React components with your own UI.
4. Keep all harness communication inside hooks/components that call the public API.
