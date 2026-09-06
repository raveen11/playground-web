# Architecture Migration: IndexedDB → PostgreSQL + Prisma ORM

## Overview
We have completed the architecture migration of **PlaygroundWeb** from client-side IndexedDB persistence to **PostgreSQL + Prisma ORM** as the permanent source of truth. The application now uses database-first mutations paired with WebSocket broadcasts for real-time synchronization across connected clients.

---

## Changes Made

### 1. Database Schema & Migrations (Prisma ORM)
- **Files Modified**:
  - [board.prisma](file:///c:/Coding/playground-web/server/prisma/schema/board.prisma)
  - [auth.prisma](file:///c:/Coding/playground-web/server/prisma/schema/auth.prisma)
  - [20260906125000_add_playground_entities/migration.sql](file:///c:/Coding/playground-web/server/prisma/migrations/20260906125000_add_playground_entities/migration.sql)
- **Models & Tables Defined**:
  - `Board` (`boards`): Scoped to `Company` via `companyId`.
  - `BoardColumn` (`board_columns`): Linked to `Board` with ordered position.
  - `Ticket` (`tickets`): Linked to `Board`, `BoardColumn`, optional `assignee` (`User`), and tracking `position`, `priority`, and `status`. Note: transient `editorId` is **not** persisted to the database.
  - `ChatMessage` (`chat_messages`): Persistent company/board chat messages with `sender`, `senderId`, `text`, and timestamps.
  - `SocialMedia` (`social_media`): Company brand social accounts (`platform`, `username`, `profileUrl`, encrypted/masked `accessToken`).
- **Applied Safely**: Migration deployed with `prisma migrate deploy` directly to the active database without any data destruction or `migrate reset`.

---

### 2. Backend Services Layer
- **[board.service.ts](file:///c:/Coding/playground-web/server/src/services/board.service.ts)**:
  - Full board lifecycle management (`listBoards`, `getBoard`, `createBoard`, `updateBoard`, `deleteBoard`).
  - `ensureDefaultBoard`: Automatically seeds a default "Main Board" with default columns ("Todo", "In Progress", "Done") if a company doesn't have one yet.
- **[column.service.ts](file:///c:/Coding/playground-web/server/src/services/column.service.ts)**:
  - Column creation, updates, deletion, and position management.
- **[ticket.service.ts](file:///c:/Coding/playground-web/server/src/services/ticket.service.ts)**:
  - Ticket CRUD operations.
  - **Atomic Cross-Column & Reordering Transaction**: `moveTicket` uses an atomic `prisma.$transaction` to recalculate and shift ticket positions within source and target columns cleanly without race conditions.
- **[chat.service.ts](file:///c:/Coding/playground-web/server/src/services/chat.service.ts)**:
  - Fetching history and persisting incoming chat messages.
- **[social-media.service.ts](file:///c:/Coding/playground-web/server/src/services/social-media.service.ts)**:
  - CRUD for social accounts, ensuring `accessToken` is omitted/masked from GET responses.

---

### 3. Backend REST Controllers & Endpoints
- **Controllers**:
  - [board.controller.ts](file:///c:/Coding/playground-web/server/src/api/controllers/board.controller.ts)
  - [column.controller.ts](file:///c:/Coding/playground-web/server/src/api/controllers/column.controller.ts)
  - [ticket.controller.ts](file:///c:/Coding/playground-web/server/src/api/controllers/ticket.controller.ts)
  - [chat-message.controller.ts](file:///c:/Coding/playground-web/server/src/api/controllers/chat-message.controller.ts)
  - [social-media.controller.ts](file:///c:/Coding/playground-web/server/src/api/controllers/social-media.controller.ts)
  - [company.controller.ts](file:///c:/Coding/playground-web/server/src/api/controllers/company.controller.ts) (`getCompanyUsers`)
- **API Routes**:
  - `GET /api/boards` & `GET /api/boards/:boardId`
  - `POST /api/boards`, `PATCH /api/boards/:boardId`, `DELETE /api/boards/:boardId`
  - `POST /api/boards/:boardId/columns`, `PATCH /api/columns/:columnId`, `DELETE /api/columns/:columnId`
  - `GET /api/tickets/board/:boardId`
  - `POST /api/tickets`, `PATCH /api/tickets/:ticketId`, `DELETE /api/tickets/:ticketId`
  - `POST /api/tickets/:ticketId/move` (atomic move / reorder)
  - `GET /api/chat/messages` & `POST /api/chat/messages`
  - `GET /api/social-media`, `POST /api/social-media`, `DELETE /api/social-media/:id`
  - `GET /api/company/users`
- Mounted in [app.ts](file:///c:/Coding/playground-web/server/src/api/app.ts) with full validation schemas in [board.schemas.ts](file:///c:/Coding/playground-web/server/src/api/schemas/board.schemas.ts).

---

### 4. Real-Time WebSocket Synchronization (Write-First Rule)
- **[server/src/realtime/board/helper.ts](file:///c:/Coding/playground-web/server/src/realtime/board/helper.ts)**:
  - On room join (`room:join`), initial state is hydrated directly from PostgreSQL boards, columns, and tickets.
  - `card:create`, `card:update`, `card:move`, `card:delete`: All database writes execute first via the service layer. Once committed to PostgreSQL, the event is broadcast to all clients in the room.
- **[server/src/realtime/chat/handler.ts](file:///c:/Coding/playground-web/server/src/realtime/chat/handler.ts)**:
  - Incoming chat messages are stored in PostgreSQL first via `chatService.createMessage` before broadcasting.

---

### 5. Frontend & IndexedDB Decommissioning
- **Client API**:
  - [frontend/src/lib/apiClient.ts](file:///c:/Coding/playground-web/frontend/src/lib/apiClient.ts): Fully typed methods for `boards`, `columns`, `tickets`, `chat`, `socialMedia`, and `company.listUsers`.
- **Complete IndexedDB Removal**:
  - Removed `kanban-auth` database, `openDb`, `loadSavedUser`, `saveUser`, and `saveBoardChatMessages` from [Dashboard.tsx](file:///c:/Coding/playground-web/frontend/src/components/Dashboard.tsx).
  - Authenticated user is fetched from `api.auth.me()`, active board is fetched from `api.boards.list()`.
  - Removed `onPersist` IndexedDB callbacks from [ChatPanel.tsx](file:///c:/Coding/playground-web/frontend/src/components/chat/ChatPanel.tsx). Chat messages now load and persist via PostgreSQL API.
- **UI Enhancements**:
  - [Board.tsx](file:///c:/Coding/playground-web/frontend/src/components/board/Board.tsx): Renders columns and tickets from PostgreSQL. Supports creating tickets with title, description, priority, and assignee; drag-and-drop column movement with atomic updates (`api.tickets.move`); adding/deleting columns; and live WebSocket reflections.
  - [SocialMediaPanel.tsx](file:///c:/Coding/playground-web/frontend/src/components/social/SocialMediaPanel.tsx): Brand social accounts management panel with platform selection, handle, link, and delete capabilities.

---

## Verification & Validation

### 1. Integration Test Suite (`test_api_and_db.ts`)
Run against live PostgreSQL database and Express API:
```text
1. GET /health status: 200 { status: 'ok' }
2. GET /api/boards: 200 (Active board loaded with columns)
3. GET /api/boards/:id: 200 (Todo, In Progress, Done, etc.)
4. POST /api/tickets: 201 (Ticket A & Ticket B created)
5. POST /api/tickets/:id/move: 200 (Atomic movement between columns verified)
6. GET /api/tickets/board/:boardId: 200 (Tickets listed)
7. POST /api/chat/messages: 201 (Persistent message created)
8. GET /api/chat/messages: 200 (Chat history retrieved)
9. POST /api/social-media: 201 (GitHub account created)
10. GET /api/social-media: 200 (Account retrieved; accessToken omitted)
11. GET /api/company/users: 200 (Company team members retrieved)
12. Cleaned up test items successfully.
ALL TESTS PASSED WITH 100% SUCCESS!
```

### 2. Compilation & Linting
- **Server**: `npm run build` completed successfully (`prisma generate && tsc` passed with code 0).
- **Frontend**: `npm run build` completed successfully (`next build --turbopack` generated all static pages with code 0).
- **Codebase Cleanliness**: Verified with ripgrep that 0 references to `indexedDB` or `kanban-auth` remain in the frontend application.
