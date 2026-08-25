                    WebSocket
                        │
                        ▼
                 websocket.ts
                        │
                        ▼
                    router.ts
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
        Board          Chat       Whiteboard
      handler.ts     handler.ts    handler.ts
          │             │             │
          ▼             ▼             ▼
     RoomManager    BoardState    WhiteboardManager



realtime/
├──WebSocket
   ├──websocket.ts
├── router.ts
├── context.ts
├── error.ts
│
├── board/
│   ├── handler.ts
│   ├── state.ts
│   └── room-manager.ts        // existing
│
├── chat/
│   └── handler.ts
│
└── whiteboard/
    ├── handler.ts
    ├── rooms.ts
    └── whiteboard-manager.ts  // existing