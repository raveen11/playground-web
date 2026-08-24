# Code Canvas — Implementation Guide

The `/whiteboard` route used to be a shape editor drawn on an HTML5 `<canvas>`.
It is now a **collaborative code canvas**: an infinite React Flow surface where
you drag Monaco code editors out of a palette, and everyone typing in them sees
each other's characters in real time.

This document is written for someone who has never opened this repo before. It
explains **what exists**, **how data moves**, and **how the code is compiled and
run** — in that order.

> Note: `WHITEBOARD_IMPLEMENTATION.md` in this same folder describes the *old*
> shape editor and its `apps/web` / `packages/shared` folder layout. Both the
> feature and the folders it names are gone. Read this file instead.

---

## 1. What was built

| | Before | After |
|---|---|---|
| Surface | HTML5 `<canvas>`, manual painting | React Flow (`@xyflow/react`) |
| Content | rectangles, circles, text, lines | Monaco code editors |
| Adding things | drag on empty canvas | drag an item out of a left-hand palette |
| Sync | whiteboard operations over WebSocket | **the same** whiteboard operations over WebSocket |

The last row is the important one. The real-time engine was **not rewritten**.
The new UI plugs into the existing operation pipeline — same envelope format,
same WebSocket client, same server manager, same `text.update` operation that
text elements already used.

Three requirements, three answers:

1. **React Flow canvas** → [CodeCanvas.tsx](frontend/src/components/whiteboard/CodeCanvas.tsx)
2. **Monaco as a drag-and-drop node** → [NodePalette.tsx](frontend/src/components/whiteboard/NodePalette.tsx) (drag source) + [CodeEditorNode.tsx](frontend/src/components/whiteboard/CodeEditorNode.tsx) (the node)
3. **Real-time typing reusing existing logic** → [useCollaborativeMonaco.ts](frontend/src/features/collaboration/hooks/useCollaborativeMonaco.ts)

---

## 2. The repo in one picture

It is a **pnpm workspace** with three packages (see `pnpm-workspace.yaml`):

```
D:\multiplayer-kanban
├── shared/     @kanban/shared   — types + zod schemas + one pure function.
│                                 Compiled to dist/, imported by BOTH sides.
├── server/     @kanban/ws-server — Express HTTP (:3001) + WebSocket (:3002)
└── frontend/   web              — Next.js 15 App Router (:3000)
```

`shared` is the contract. If the frontend and the server disagree about what a
`text.update` operation looks like, nothing works — so both import the same
compiled package rather than keeping two copies of the types.

---

## 3. Files that matter (and what each one is for)

### Shared contract — `shared/src/`

| File | Role |
|---|---|
| `whiteboard.types.ts` | `WhiteboardElement`, `WhiteboardDocument`, `CodeLanguage`. **Added** `type: "code"` plus `language` and `title` fields. |
| `operations.types.ts` | The 8 operation shapes and the `OperationEnvelope` wrapper. Unchanged. |
| `schemas.ts` | Zod validators. **Added** `CodeLanguageSchema`; taught `WhiteboardElementSchema` and `element.update` about `language`/`title`. Without this the server rejects every code operation. |
| `apply-whiteboard-operation.ts` | The **one** pure function that turns `(document, operation)` into a new document. **Changed one line** so `text.update` accepts `code` elements as well as `text` ones. |

### Server — `server/src/realtime/`

| File | Role |
|---|---|
| `websocket/server.ts` | Owns the socket. Validates inbound messages with zod, tracks who joined which whiteboard, applies operations, broadcasts them. **Changed:** the join handler now falls back to a full snapshot when a replay isn't possible. |
| `whiteboard/whiteboard-manager.ts` | In-memory source of truth: documents, version counters, and the operation log. **Changed:** log capped at 2 000 operations + a new `canReplayFrom()`. |
| `whiteboard/whiteboard-manager.test.ts` | `node:test` unit tests. **Added** two: code content streaming through `text.update`, and the replay-window cap. |

### Frontend — `frontend/src/`

| File | Role | New? |
|---|---|---|
| `app/whiteboard/page.tsx` | Route entry. Name/canvas join form, then loads the canvas with `ssr: false`. | rewritten |
| `components/whiteboard/CodeCanvas.tsx` | The React Flow canvas. Projects document → nodes, handles drop/drag/resize. | new |
| `components/whiteboard/CodeEditorNode.tsx` | One node = header + Monaco editor + resize handles. | new |
| `components/whiteboard/NodePalette.tsx` | Left sidebar; each row is an HTML5 drag source. | new |
| `components/whiteboard/codeLanguages.ts` | The 8 languages, their starter snippets, and the drag MIME type. | new |
| `features/collaboration/hooks/useWhiteboard.ts` | Connects WebSocket ↔ reducer. **Added** `subscribeToRemoteOperations` and `snapshotEpoch`. | modified |
| `features/collaboration/hooks/useCollaborativeMonaco.ts` | Binds one Monaco instance to one element's content. **This is the real-time typing logic.** | new |
| `features/collaboration/canvas/CollabSessionContext.tsx` | React context handing stable callbacks to nodes. | new |
| `features/collaboration/text/textDiff.ts` | Pure "what changed between these two strings" helper. | new |
| `features/collaboration/operations/operationFactory.ts` | Builds envelopes. **Added** `createCodeElement`. | modified |
| `features/collaboration/operations/whiteboardReducer.ts` | `useReducer` wrapper over `applyOperation`. | untouched |
| `features/collaboration/operations/applyOperation.ts` | Thin re-export of the shared pure function. | untouched |
| `features/collaboration/websocket/whiteboardWebSocketClient.ts` | Raw socket plumbing: connect, heartbeat, reconnect with backoff, message dispatch. | untouched |

**Deleted:** `Whiteboard.tsx` (849 lines of canvas painting), `TextEditorToolbar.tsx`,
and `text/textFormatting.ts` (already dead — nothing imported it).

---

## 4. The core idea: everything is an operation

Nobody ever sends "here is the new document". Every change is a small,
self-describing **operation** wrapped in an **envelope**:

```ts
// The envelope: who, where, when
{
  operationId: "op-3f9c…",     // unique — used for de-duplication
  documentId:  "default-canvas",
  userId:      "user-a1b2…",
  version:     7,               // last server version this client had seen
  timestamp:   1756000000000,
  operation: {                  // the actual change
    type: "text.update",
    elementId: "code-8d21…",
    content: "const a = 1;\nconst b = 2;"
  }
}
```

Two properties follow from this design:

- **The server assigns order.** It ignores the client's `version` for ordering and
  simply stamps `serverVersion = currentVersion + 1`. Whatever arrives first wins
  the lower number, and every client applies operations in that order.
- **Applying is a pure function.** `applyWhiteboardOperation(doc, envelope)`
  returns a *new* document and touches nothing else. Same inputs → same output,
  on the server and in the browser, which is why both can stay in step.

`text.update` carries the **whole file content**, not a character delta. That
keeps the wire format dead simple; the cleverness needed to avoid wrecking your
cursor lives on the client (see §6.3).

---

## 5. Startup: what happens when you open `/whiteboard`

```
Browser                                   Server
───────                                   ──────
1  page.tsx renders the join form
   (userId comes from localStorage,
    or is generated once and saved)

2  you submit name + canvas id
      │
3  <CodeCanvas> loads (dynamic import,
   ssr:false — Monaco needs `window`)
      │
4  useWhiteboard() constructs
   WhiteboardWebSocketClient
      │
5  new WebSocket("ws://host:3002") ──────► connection accepted
      │
6  send { type:"whiteboard:join",  ──────► zod-validate → WhiteboardJoinMsg
           whiteboardId, userId,           add socket to room "whiteboard:<id>"
           lastVersion: 0 }                getDocument() (creates if absent)
      │                                    lastVersion === 0 → send everything
7  ◄──────────────────────────────────────  { type:"document.snapshot", document }
      │
8  dispatch({type:"init"}) → document state
   isLoading = false, snapshotEpoch++ 
      │
9  effect projects document.elements
   → React Flow nodes → canvas paints
```

A ping is sent every 30 s to keep the socket warm. If the socket closes, the
client retries with exponential backoff (500 ms → 1 s → 2 s … capped at 8 s) and
re-joins using its `lastVersion`, which is how §6.6 recovery kicks in.

---

## 6. Data flow, one gesture at a time

### 6.1 Dragging a code block from the palette (requirement 2)

```
NodePalette row: onDragStart
  dataTransfer.setData("application/x-kanban-code-node", "typescript")
        │
        ▼   you release the mouse over the canvas
CodeCanvas.handleDrop
  1. read the language id back out of dataTransfer
  2. screenToFlowPosition({clientX, clientY})   ← pixels → canvas coordinates
  3. createCodeElement(userId, {position, language, title, starter content})
  4. createElementOperation(...)  →  applyLocalOperation(envelope)
        │
        ├─ dispatch locally  → document gains the element → node appears NOW
        └─ ws.send({type:"whiteboard:operation", operation})
                 │
                 ▼
        server: zod-validate → is this socket joined to this document? → yes
                applyWhiteboardOperation → serverVersion = N+1 → push to log
                broadcast {type:"operation", operation} to EVERY socket in the room
                 │
     ┌───────────┴────────────┐
     ▼                        ▼
  you (echo)            other people
  reducer re-applies    reducer applies → node appears on their canvas
  (idempotent: creating
   an existing id is
   a no-op)
```

That optimistic local dispatch in step 4 is why the editor appears instantly
instead of after a network round trip.

### 6.2 Typing — outbound (requirement 3)

This is the hot path. A person types 5 characters per second; sending one
WebSocket frame per keystroke would flood the log, so keystrokes are batched.

```
you press a key
      │
Monaco onChange(value)
      │
useCollaborativeMonaco.handleEditorChange
      │
      ├─ if we are mid-remote-apply → ignore (executeEdits fires onChange too)
      │
      ├─ pendingContentRef = value          ← always the LATEST full buffer
      │
      └─ scheduleFlush()
             │
             ├─ a timer is already running? → return, the trailing send covers it
             │
             ├─ flush() immediately            ← leading edge: first key feels instant
             │     └─ createTextUpdateOperation(...)   ← EXISTING factory, unchanged
             │           └─ session.applyLocalOperation(...) ← EXISTING hook, unchanged
             │
             └─ setTimeout(120 ms) → on fire, if more was typed, flush again
```

Net effect: the first character goes out immediately, then at most one operation
per 120 ms while you keep typing, then a final one when you stop. `flush()` also
runs when the editor loses focus and when the node unmounts, so nothing is left
queued.

Because `pendingContentRef` always holds the newest buffer, a burst of 12
keystrokes collapses into one operation carrying the final text — not 12
operations.

### 6.3 Typing — inbound (the cursor problem)

Your collaborator's operation arrives carrying **the whole file**. Naively you'd
call `editor.setValue(content)` — which throws away your cursor position, your
selection, and your undo history. Instead:

```
server broadcast → whiteboardWebSocketClient.handleOperation
      │  lastKnownVersion = serverVersion
      ▼
useWhiteboard.onOperation
      │
      ├─ dispatch({type:"apply-operation"})     ← document state stays authoritative
      │
      ├─ envelope.userId === me ?  → STOP.      ← echo suppression, see below
      │
      └─ notify every subscribeToRemoteOperations listener
                │
                ▼
       useCollaborativeMonaco (the listener for THIS element id)
                │
                ├─ diffText(currentBuffer, incomingContent)
                │     scans forward for the common prefix, backward for the
                │     common suffix, and returns the one span between them:
                │     { start: 12, end: 12, text: "b" }
                │
                ├─ model.getPositionAt(offset) × 2   → line/column range
                │
                ├─ isApplyingRemote = true
                │   editor.executeEdits("collab-remote", [{range, text}])
                │   isApplyingRemote = false
                │       └─ Monaco itself shifts your cursor, selection and undo
                │          stack the same way it would for a local edit
                │
                └─ if we still have unsent local characters, re-read the buffer:
                   it now holds "their edit merged over mine", and that merged
                   text is what we must send next — not our stale snapshot
```

**Why echo suppression matters.** The server broadcasts to *every* socket in the
room, including the author. Without the `userId === me` check, your own
operation would come back and be re-applied to your editor — and since it
carries the text as it was ~120 ms ago, it would visibly delete whatever you
typed in the meantime. Filtering by author is the whole fix, and it lives in one
place (`useWhiteboard`) so every subscriber gets it for free.

### 6.4 Moving and resizing a node

Same pipeline, different operations, plus one wrinkle: while *your* mouse is
dragging a node, echoed positions from the server must not be allowed to yank it
around.

```
onNodeDragStart  → beginGeometryEdit(id)   → interactingIdsRef.add(id)
onNodeDrag       → throttled 80 ms → createMoveOperation → applyLocalOperation
onNodeDragStop   → one final createMoveOperation → endGeometryEdit(id)

NodeResizer onResizeStart / onResize / onResizeEnd
                 → same shape, using createUpdateOperation with {position, size}
```

The node-projection effect checks `interactingIdsRef` (and React Flow's own
`node.dragging` flag). While an id is in that set, React Flow keeps ownership of
that node's geometry and incoming values are ignored. On release, ownership goes
back to the document.

### 6.5 Deleting, and changing language

- **Delete** → the `×` button in the node header → `createDeleteOperation`.
  React Flow's own Delete/Backspace handling is switched off
  (`deleteKeyCode={null}`) because those keys belong to Monaco while you are
  typing.
- **Language** → the `<select>` in the header → `flush()` first (so queued
  characters are ordered *before* the switch), then `createUpdateOperation` with
  `{ language }`.

Both header controls carry the `nodrag` class so clicking them doesn't start a
node drag.

### 6.6 Reconnecting

The client remembers `lastKnownVersion`. On re-join:

```
client: { whiteboard:join, lastVersion: 57 }
              │
server decides:
   lastVersion === 0                     → full snapshot (first ever join)
   lastVersion > currentVersion          → full snapshot (server restarted, client ahead)
   !canReplayFrom(id, 57)                → full snapshot (log was trimmed past 57)
   otherwise                             → { whiteboard:sync, operations: >57 }
```

`canReplayFrom` is honest about the 2 000-operation cap: if the oldest retained
operation is newer than `lastVersion + 1`, there is a hole in the history and a
snapshot is the only correct answer. When a snapshot does arrive,
`snapshotEpoch` increments, and each editor hard-resets its buffer to the
authoritative content instead of silently drifting.

---

## 7. Why the canvas doesn't re-render while people type

This is the single most important performance decision in the feature, and it is
easy to accidentally undo, so it's worth understanding.

React Flow re-renders nodes when the `nodes` array changes. Editor content
changes on **every keystroke of every user**. So:

> **Content never travels through React Flow node `data`.**

`CodeNodeData` is only `{ title, language }`. The editor reads content *once* on
mount, straight from the document via `session.getElement(id)?.content`, and
after that stays live through the operation subscription — a channel React Flow
knows nothing about.

The projection effect in `CodeCanvas` reinforces it by reusing object identities:

```ts
// same title+language? reuse the exact same data object
const data = existing && existing.data.title === title
          && existing.data.language === language ? existing.data : { title, language };

// nothing visual changed? return the existing node object untouched
if (existing && existing.data === data && existing.position === position
    && existing.width === width && existing.height === height) return existing;

// every node identical? return the previous array, so setNodes is a no-op
return unchanged ? previous : next;
```

A remote keystroke changes only `element.content`, which appears nowhere in that
comparison — so the effect returns the previous array and the canvas does
**zero** work. The keystroke lands directly in Monaco through `executeEdits`.

The context in `CollabSessionContext.tsx` exists for the same reason: nodes get
stable callbacks (`useCallback([])`) rather than changing props, so they don't
re-render when the document does.

---

## 8. How the code is compiled and run

### 8.1 The three build steps

```
shared:    tsc  →  shared/dist/*.js + *.d.ts       (ESM, target ES2022)
                   ▲              ▲
                   │              └── frontend & server both import @kanban/shared,
                   │                  which resolves to ./dist/index.js via
                   │                  package.json "exports"
                   │
server:    tsx watch src/index.ts   (dev — runs TypeScript directly, no build)
           tsc → server/dist/       (prod)

frontend:  next dev --turbopack     (dev — compiles on demand)
           next build --turbopack   (prod)
```

**`shared` must be built before anything else can type-check.** That's why the
root `package.json` has:

```json
"postinstall": "pnpm --dir ./shared build"
```

If you ever see `Cannot find module '@kanban/shared'` or the compiler insisting
that `"code"` isn't a valid element type, the answer is almost always: rebuild
shared.

```bash
pnpm --dir ./shared build
```

### 8.2 What runs where

| Process | Command | Port | Notes |
|---|---|---|---|
| Next.js frontend | `pnpm dev:frontend` | 3000 | Turbopack, hot reload |
| HTTP API | `pnpm dev:server` | 3001 | Express, part of the same process |
| WebSocket | (same process) | **3002** | `WS_PORT`, set in `server/.env` |

Both server listeners come from one `node` process — `server/src/index.ts`
starts Express and imports `realtime/websocket/server.ts`, which opens its own
`WebSocketServer` on `WS_PORT`.

**A port gotcha worth knowing:** the old whiteboard page hard-coded
`ws://localhost:3001`, which is the *HTTP* port — so it could never connect. The
new page resolves the URL properly:

```ts
process.env.NEXT_PUBLIC_WS_URL ?? `ws://${window.location.hostname}:3002`
```

Set `NEXT_PUBLIC_WS_URL` in `frontend/.env.local` if your WebSocket lives
somewhere else.

### 8.3 Runtime dependencies to be aware of

- **Monaco is loaded from a CDN at runtime.** `@monaco-editor/react` fetches the
  editor from jsDelivr on first mount, so the very first editor needs network
  access. `monaco-editor` is installed as a *devDependency* purely so
  TypeScript can resolve the `editor.IStandaloneCodeEditor` type.
- **Everything is in memory.** `WhiteboardManager` uses `Map`s. Restart the
  server and all canvases are empty. There is no database persistence yet.

### 8.4 Running it

```bash
pnpm install
```

```bash
pnpm dev
```

That runs frontend and server in parallel. Then open
`http://localhost:3000/whiteboard`, enter a name, keep the canvas id as
`default-canvas`, and open a **second tab** with the same canvas id to
collaborate with yourself.

Try, in order: drag `TypeScript` from the palette onto the canvas → both tabs
show the editor → type in one → characters appear in the other, and an amber
"remote edit" badge pulses in its header → drag the node header → it moves in
both → select the node and drag a corner → it resizes in both.

### 8.5 Tests and checks

```bash
pnpm --dir ./server test:whiteboard
```

Builds shared, builds the server, then runs the `node:test` suite. Current
state — 3 passing:

```
✔ applies, versions, deduplicates, and recovers whiteboard operations
✔ streams code element content through text.update operations
✔ reports when a reconnecting client falls outside the replay window
```

```bash
pnpm --dir ./frontend exec tsc --noEmit
```

Reports **5 pre-existing errors** in `src/lib/documents/processsDocument.ts`
(`TS2304: Cannot find name 'extractText'` and friends). That file is unrelated to
this feature and was not touched — verified with `git stash push`, which found no
local changes in it.

---

## 9. Design decisions, and the trade-off each one makes

| Decision | Why | What it costs |
|---|---|---|
| Reuse `text.update` instead of adding a `code.update` operation | Zero new protocol surface; the server, schemas and reducer already handled it. One line changed in the pure function. | The operation carries full content, not a delta. |
| Full content on the wire | Trivially correct, no server-side text merge logic. | Bandwidth grows with file size. Fine for snippets, wrong for a 5 000-line file. |
| Minimal diff on **apply** only | Keeps the caret, selection and undo stack intact without complicating the protocol. | The diff is prefix/suffix based — good for typing, not a true 3-way merge. |
| Throttle at 120 ms, leading + trailing | First keystroke feels instant; bursts collapse into one operation. | Up to 120 ms of latency for collaborators mid-burst. |
| Filter own operations by `userId` | Kills the echo loop in one place instead of in every consumer. | Requires user ids to be genuinely unique (they're `crypto.randomUUID()`). |
| Content excluded from node `data` | Typing costs zero canvas re-renders. | Content lives in two places (document + Monaco model) and needs `snapshotEpoch` to re-sync. |
| Cap the operation log at 2 000 + `canReplayFrom` | Typing produces orders of magnitude more operations than shape dragging; an unbounded log leaks memory. | A client offline for a long busy stretch gets a snapshot instead of a replay. |
| No React Flow edges | Edges aren't part of `WhiteboardDocument`, so they couldn't be persisted or synced — a connection you drew would vanish on reload. | No visual links between blocks yet. |
| `deleteKeyCode={null}` | Backspace inside Monaco must delete a character, not the node. | Deleting is mouse-only, via the header `×`. |

---

## 10. Known limits

- **Two people typing in the same block at the same instant: last write wins.**
  This is full-content sync, not OT or a CRDT. Alternating edits merge cleanly
  (that's what `diffText` is for); simultaneous edits to the same region will
  lose one side. Proper concurrent editing means Yjs or `y-monaco`.
- **No persistence.** Server restart = empty canvases.
- **No presence.** You see *that* someone is editing (the amber badge), not
  their cursor or selection.
- **No undo across users.** Monaco's undo stack is local; undoing sends your
  buffer as a new `text.update`, which is correct but not a shared history.
- **Browser verification wasn't run** for this change — starting the dev server
  was declined, so the evidence above is type-checks and unit tests, not
  screenshots. §8.4 is the manual pass to run.

## 11. Natural next steps

1. Swap `text.update` for a `y-monaco` binding to get true concurrent editing.
2. Persist documents and periodic snapshots to Postgres so a restart isn't fatal.
3. Add presence: broadcast cursor and selection as ephemeral, non-versioned
   messages (they must *not* go into the operation log).
4. Delete the stale `WHITEBOARD_IMPLEMENTATION.md`, or mark it historical.

---

## Glossary

| Term | Meaning |
|---|---|
| **Operation** | One atomic change (`text.update`, `element.move`, …). |
| **Envelope** | An operation plus who/where/when metadata and a unique `operationId`. |
| **ServerOperation** | An envelope after the server stamped it with `serverVersion`. |
| **Optimistic update** | Applying a change locally before the server confirms it, so the UI feels instant. |
| **Echo** | Your own operation coming back to you from the broadcast. |
| **Snapshot** | The whole document, sent when replaying individual operations isn't possible. |
| **Replay** | Catching a reconnecting client up by re-sending the operations it missed. |
| **Projection** | Deriving React Flow's `nodes` array from `document.elements`. |
| **`nodrag` / `nowheel` / `nopan`** | React Flow class names that tell the canvas to keep its hands off an element — needed so Monaco can own clicks, scrolling and text selection. |
