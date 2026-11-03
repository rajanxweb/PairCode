# PairCode — Realtime Collaboration & Synchronization

## 1. Collaborative Architecture (Yjs & Hocuspocus)

PairCode leverages Yjs (a Conflict-Free Replicated Data Type - CRDT library) paired with Hocuspocus (a real-time WebSocket backend for Yjs) to power fluid, concurrent code editing and live cursor tracking.

```text
 ┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
 │          Interviewer Browser         │          │          Candidate Browser           │
 │                                      │          │                                      │
 │   ┌──────────────────────────────┐   │          │   ┌──────────────────────────────┐   │
 │   │        Monaco Editor         │   │          │   │        Monaco Editor         │   │
 │   └──────────────▲───────────────┘   │          │   └──────────────▲───────────────┘   │
 │                  │ y-monaco          │          │                  │ y-monaco          │
 │   ┌──────────────▼───────────────┐   │          │   ┌──────────────▼───────────────┐   │
 │   │      Y.Doc (CRDT state)      │   │          │   │      Y.Doc (CRDT state)      │   │
 │   └──────────────▲───────────────┘   │          │   └──────────────▲───────────────┘   │
 │                  │                   │          │                  │                   │
 │   ┌──────────────▼───────────────┐   │          │   ┌──────────────▼───────────────┐   │
 │   │     Hocuspocus Provider      │   │          │   │     Hocuspocus Provider      │   │
 │   └──────────────┬───────────────┘   │          │   └──────────────┬───────────────┘   │
 └──────────────────┼───────────────────┘          └──────────────────┼───────────────────┘
                    │                                                 │
                    │ WSS /collaboration                              │ WSS /collaboration
                    ▼                                                 ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                 apps/realtime (Hocuspocus Server)               │
        │                                                                 │
        │  1. onAuthenticate(JWT Token, Session ID)                      │
        │  2. onLoadDocument(Load Binary Snapshot from DB / Seed Code)    │
        │  3. Broadcast CRDT binary state vectors & Awareness             │
        │  4. onStoreDocument(Debounced binary persistence to DB)         │
        │  5. Reject document edits if Interview Session is COMPLETED     │
        └────────────────────────────────┬────────────────────────────────┘
                                         │
                                         │ Prisma (Binary state)
                                         ▼
                            ┌─────────────────────────┐
                            │  PostgreSQL YjsDocument │
                            └─────────────────────────┘
```

---

## 2. Authentication & Authorization in WebSocket Handshake

1. **Token Generation**: When a participant enters an interview room (`/room/[roomCode]`), the web app requests a short-lived signed JWT via `POST /api/interviews/[id]/realtime-token`.
2. **Payload Claims**:
   - `sub`: User ID
   - `sessionId`: InterviewSession ID
   - `roomCode`: Public Room Code
   - `role`: `INTERVIEWER` | `CANDIDATE`
   - `exp`: 15 minutes validity
3. **Hocuspocus `onAuthenticate` Hook**:
   - The client sends the token in the query parameter or connection payload.
   - Hocuspocus verifies token signature against `REALTIME_JWT_SECRET`.
   - Compares token `sessionId` to the requested document name (`paircode:session:<id>`).
   - Verifies the user is either the assigned interviewer or candidate in PostgreSQL.
   - Checks that the session is not `COMPLETED`. If completed, connection is closed or set to read-only.

---

## 3. Collaborative Document Lifecycle & Persistence

### 3.1 Room Naming Convention
Every interview document is isolated by a deterministic namespace:
```text
paircode:session:<sessionId>
```

### 3.2 Loading Existing Document (`onLoadDocument`)
1. Hocuspocus checks PostgreSQL `YjsDocument` table for the matching `sessionId`.
2. If found, decodes binary `state` using `Y.applyUpdate(document, state)`.
3. If not found, fetches the session's question from PostgreSQL, extracts starter code for Python (or default language), creates a text node `ydoc.getText("code")`, and inserts the starter code as initial content.

### 3.3 Debounced Persistence (`onStoreDocument`)
To prevent database write amplification on every individual keystroke:
- Hocuspocus is configured with debounced persistence (e.g., 2,000ms debounce interval with a maximum wait time of 10,000ms).
- When triggered, extracts `Y.encodeStateAsUpdate(document)` as a Node.js `Buffer`.
- Upserts the binary payload into PostgreSQL `YjsDocument (sessionId, state, updatedAt)`.

### 3.4 Interview Termination Snapshot
When the interviewer clicks "End Interview" via `POST /api/interviews/[id]/end`:
- The backend loads the current Yjs document from DB (or realtime instance).
- Extracts plain text `sharedCode.toString()`.
- Writes it directly to `InterviewSession.finalCode`.
- Broadcasts session status `COMPLETED`.

---

## 4. Shared Cursors & Presence (Yjs Awareness)

Awareness is handled over the same WebSocket connection using Yjs Awareness protocol:
- **User State**:
  ```typescript
  {
    user: {
      id: string,
      name: string,
      color: string, // Assigned stable color, e.g. #326B57 for interviewer, #B77935 for candidate
      role: "INTERVIEWER" | "CANDIDATE"
    },
    cursor: {
      line: number,
      column: number
    },
    selection: {
      startLine: number,
      startColumn: number,
      endLine: number,
      endColumn: number
    }
  }
  ```
- **Monaco Binding**:
  - `y-monaco` attaches cursor decorations and selection highlights in the editor without interfering with local typing.
  - Remote cursors render with subtle participant name tags.

---

## 5. Reconnection & Resilience

- **Connection States**: The client interface exposes a clear connection badge:
  - `connected`: Active WebSocket connection, synchronized state.
  - `connecting`: Establishing initial handshake.
  - `reconnecting`: Automatic backoff retry after transient network disruption.
  - `disconnected`: Connection severed; manual reconnect button shown.
- **Offline Edits**: If a participant experiences brief network dropouts, local edits remain in memory and automatically merge seamlessly into the document upon reconnection via Yjs state vectors.
- **Server Restart**: Hocuspocus reboots cleanly; connected clients reconnect; document state is restored from `YjsDocument`.
