# Multiplayer Kanban Playground

A realtime collaborative playground for experimenting with drag-and-drop UI, live chat, shared board interactions, and future microfrontend-style architecture.

This project is designed as a learning sandbox for building interactive web experiences. The idea is simple: create a live workspace where users can move things around, communicate in real time, and test new patterns for building customizable and collaborative interfaces.

The long-term vision is a playground where we can try new ideas, rapid prototypes, and UI experiments without worrying about shipping a final product too early.

---

## Project purpose

This repo is not only a kanban board. It is a playground for experimenting with:

- drag and drop user interfaces
- realtime collaboration over WebSockets
- shared board state between multiple users
- live chat inside a collaborative workspace
- whiteboard-like interactions and movable elements
- user presence and activity awareness
- customizable UI patterns for future app modules
- microfrontend and modular architecture thinking

The core idea: anything new we want to learn can become a feature in this playground.

---

## What the app does today

The current app is a collaborative Kanban board with realtime features:

- users can join a board
- cards can be created and moved across columns
- updates sync live across connected users
- a user presence panel shows who is active
- users can chat with each other in real time
- typing status is visible while someone is composing a message

This gives a solid base for evolving into a richer visual workspace.

---

## Future vision

This project is meant to grow into a general playground for building interactive web experiences, such as:

- draggable widgets
- whiteboard/training board layouts
- sticky note areas
- dashboard-like workspaces
- modular microfrontend app shells
- customizable collaboration surfaces
- experiments with reusable UI blocks

In short, this app is a place where learning and experimentation are the main goal.

---

## Architecture

**New here?** Start with the plain-language data-flow guide: [WORKFLOW.md](./WORKFLOW.md)

This monorepo is organized in a simple and flexible way:

### frontend
The frontend application built with Next.js and React.

Responsibilities:
- render the board UI
- manage user profile and session
- connect to the WebSocket server
- sync realtime board updates
- handle drag and drop interactions
- render live chat and presence data

### server
The realtime backend built with Node.js and WebSockets.

Responsibilities:
- accept client connections
- manage board rooms and user sessions
- keep shared board state in memory
- validate incoming events
- broadcast board updates to all users in the room
- share chat and typing events in real time

### shared
Shared TypeScript definitions and validation schemas.

Responsibilities:
- centralize message contracts
- keep frontend and backend aligned
- validate payloads safely using Zod

---

## Tech stack

- Next.js
- React
- TypeScript
- Node.js
- WebSockets
- pnpm workspaces
- Zod
- IndexedDB

---

## Project structure

```text
multiplayer-kanban/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── next.config.ts
├── server/
│   ├── src/
│   └── package.json
├── shared/
│   ├── src/
│   └── package.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── .gitignore
```

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm

### Install dependencies

```bash
pnpm install
```

### Run the project

```bash
pnpm dev
```

This starts the web application and the realtime WebSocket server together.

### Run separately

```bash
pnpm dev:frontend
pnpm dev:server
```

---

## Local URLs

- Web app: http://localhost:3003
- WebSocket server: http://localhost:3002

---

## How the realtime flow works

The flow is simple and educational:

1. A user opens the board in the browser.
2. The browser connects to the WebSocket server.
3. The server creates or joins the board room.
4. The current board state is sent to the client.
5. The user moves cards or sends chat messages.
6. The server validates the action and updates shared state.
7. The server broadcasts the change to everyone in that room.
8. All clients update their UI in real time.

This is the foundation for building more collaborative features in the future.

---

## Playground mindset

This project is intentionally designed as a learning and experimentation space.

It is meant for trying things like:

- draggable blocks and widgets
- board-based planning flows
- live collaborative productivity tools
- visual workspaces for team coordination
- microfrontend-style modular patterns
- experiment-driven frontend engineering

Anything new we learn can be added here and tested quickly.

---

## Notes

This is a prototype and playground project, not a finished production app. The goal is to make it easier to experiment with real-time collaborative UI concepts while keeping the codebase understandable and extensible.

---

## License

This project is currently intended for learning, prototype development, and experimentation.
