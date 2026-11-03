# PairCode — System Architecture

## 1. High-Level Architecture Overview

PairCode is engineered as a modular, type-safe monorepo consisting of three independently deployable application tiers, a shared core library, and a shared PostgreSQL database.

```text
                               ┌─────────────────────────────┐
                               │       Client Browsers       │
                               │  (Interviewer & Candidate)  │
                               └──────────────┬──────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ HTTPS                                         │ WSS
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │        apps/web         │                     │      apps/realtime      │
         │   (Next.js App Router)  │                     │   (Hocuspocus Server)   │
         │                         │                     │                         │
         │ - Route Handlers (REST) │                     │ - Yjs WebSocket Sync    │
         │ - React Server/Client   │                     │ - Room Authorization    │
         │ - Clerk Authentication  │                     │ - Live Presence & State │
         │ - Execution Scheduler   │                     │ - Snapshot Persistence  │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
                      │ Read / Write                                  │ Read / Write
                      ▼                                               ▼
         ┌─────────────────────────────────────────────────────────────────────────┐
         │                       PostgreSQL Database (Prisma)                      │
         │                                                                         │
         │  Users · Questions · Sessions · Executions · Notes · Yjs Snapshots     │
         └────────────────────────────────────▲────────────────────────────────────┘
                                              │
                                              │ Poll Pending Jobs / Update Results
                                              │ (SELECT ... FOR UPDATE SKIP LOCKED)
                                              ▼
                                 ┌─────────────────────────┐
                                 │       apps/worker       │
                                 │   (Background Daemon)   │
                                 │                         │
                                 │ - Safe Job Claiming     │
                                 │ - Judge0 API Client     │
                                 │ - Output Evaluation     │
                                 │ - Timeout & Lease Guard │
                                 └────────────┬────────────┘
                                              │
                                              │ REST Submissions
                                              ▼
                                 ┌─────────────────────────┐
                                 │     Judge0 Sandbox      │
                                 │  (Isolated Execution)   │
                                 └─────────────────────────┘
```

---

## 2. Component Responsibilities

### 2.1 `apps/web` (Web & API Tier)
- **Framework**: Next.js 15+ App Router, React 19, Tailwind CSS.
- **Role**:
  - Delivers server-rendered pages and interactive client interfaces for landing, dashboard, question bank, room shell, and interview reports.
  - Handles Clerk authentication sessions and synchronizes user profiles with PostgreSQL.
  - Exposes REST Route Handlers (`/api/*`) for question queries, interview provisioning, invitation verification, execution scheduling, and private notes.
  - Generates short-lived, cryptographically signed room JWTs for the realtime server.
  - Creates `Execution` records in status `PENDING` when users click RUN or SUBMIT.

### 2.2 `apps/realtime` (Realtime Collaboration Service)
- **Framework**: Node.js, Hocuspocus Server (`@hocuspocus/server`), Yjs.
- **Role**:
  - Serves WebSocket connections at `/collaboration`.
  - Enforces JWT authentication during handshake via `onAuthenticate` hook.
  - Validates room membership and verifies session state is not `COMPLETED`.
  - Synchronizes binary Yjs document updates with sub-50ms latency.
  - Broadcasts awareness states (cursor position, selection ranges, user names).
  - Periodically flushes binary document snapshots to PostgreSQL `YjsDocument` table via `onStoreDocument` with debouncing to prevent database write amplification.
  - Seeds new rooms with question starter code on initial connection via `onLoadDocument`.

### 2.3 `apps/worker` (Execution Engine Daemon)
- **Framework**: Node.js, TypeScript background worker process.
- **Role**:
  - Concurrently polls PostgreSQL for executions with status `PENDING`.
  - Atomically claims executions using `SELECT ... FOR UPDATE SKIP LOCKED` and sets `status = RUNNING`, `claimedAt = NOW()`.
  - Sends asynchronous code execution requests to Judge0 sandbox.
  - Polls Judge0 submission tokens with exponential backoff until completion or timeout.
  - Normalizes outputs, compares against expected test case answers, and calculates pass/fail metrics.
  - Writes back stdout, stderr, execution time, memory usage, and final verdict to `Execution` and `ExecutionCaseResult` records.
  - Automatically reclaims or fails stale jobs whose leases have expired.

### 2.4 `packages/shared` (Shared Domain Package)
- **Role**:
  - Houses shared TypeScript interfaces, DTOs, and constants.
  - Centralizes Zod validation schemas for requests and responses.
  - Defines shared domain enums: `SessionStatus`, `ExecutionStatus`, `ExecutionKind`, `Difficulty`.
  - Exports helper utilities for token hashing, time calculations, and output normalization.

---

## 3. Communication Patterns

| Origin | Destination | Protocol | Purpose |
|---|---|---|---|
| Browser | `apps/web` | HTTPS | Page rendering, REST APIs, Session management |
| Browser | `apps/realtime` | WSS | Real-time Yjs document editing & Awareness |
| `apps/web` | PostgreSQL | TCP / Prisma | Application state CRUD, execution queuing |
| `apps/realtime` | PostgreSQL | TCP / Prisma | Document snapshot loading and saving |
| `apps/worker` | PostgreSQL | TCP / Prisma | Atomic job claiming, execution result updates |
| `apps/worker` | Judge0 | HTTPS | Submitting programs, polling sandbox status |
| Browser | `apps/web` | HTTPS Polling | Polling active execution status until completion |

---

## 4. Failure Modes & Resilience

- **Realtime Server Restart**:
  - Clients automatically transition to `reconnecting` status.
  - On restart, Hocuspocus reloads the latest serialized binary snapshot from PostgreSQL `YjsDocument`.
  - Upon reconnection, Yjs CRDT merges client pending vectors without data loss.
- **Worker Crash During Execution**:
  - Stale jobs whose `claimedAt` timestamp exceeds `WORKER_JOB_LEASE_MS` are automatically reclaimed by healthy worker processes up to `WORKER_MAX_ATTEMPTS`.
  - If attempts are exhausted, the job is marked `FAILED` with an informative error message.
- **Judge0 Unavailability**:
  - The worker detects provider failures, logs structured diagnostics, marks the execution as `FAILED` with status `PROVIDER_UNAVAILABLE`, and notifies clients through polling without crashing the worker process.
