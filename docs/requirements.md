# PairCode — Product Requirements Document (PRD)

## 1. Executive Summary

PairCode is a high-performance, real-time collaborative technical coding interview platform designed for engineering teams and candidates. It merges live synchronous code editing, remote code execution across isolated sandboxes, question management, test case verification, private interviewer evaluation, and structured post-interview reporting into a unified, distraction-free environment.

- **Tagline**: Think together. Code together. Interview better.
- **Product Aesthetic**: Quiet, refined, editorial developer-tool design with dark-mode coding canvas and high-density, accessible interface.

---

## 2. Core User Roles & Permissions

### 2.1 Interviewer
- **Authentication**: Registers and signs in securely via Clerk.
- **Management**:
  - Access personal dashboard showing aggregated statistics (total, active, completed).
  - Browse and search the coding question bank with difficulty and topic filters.
  - Create interview sessions linked to selected questions with custom durations.
  - Generate cryptographically secure private invitation tokens and shareable URLs.
  - Rotate or revoke invitation tokens when necessary.
- **Live Interview Room**:
  - Join interview room as room owner.
  - Start the interview (transition status from `WAITING` to `ACTIVE`).
  - Edit code collaboratively in real-time with Monaco Editor and Yjs.
  - View candidate's live cursor position, selection range, and online presence.
  - Trigger code execution (RUN with custom stdin, SUBMIT against automated test cases).
  - View real-time execution results, stdout, stderr, and test case summaries.
  - Author private interview feedback and notes (autosaved, strictly hidden from candidate).
  - End the interview manually (snapshots final code and state, transitions status to `COMPLETED`).
- **Post-Interview**:
  - View comprehensive interview report in history, including final code snapshot, execution log, candidate details, and private notes.

### 2.2 Candidate
- **Authentication**: Registers or signs in via Clerk.
- **Joining**:
  - Opens invitation link (`/join/[token]`).
  - Verified and bound to the candidate slot of the interview.
  - Redirected directly into the assigned interview room (`/room/[roomCode]`).
  - Can reconnect anytime during the interview session.
- **Live Interview Room**:
  - View problem statement, constraints, and sample examples.
  - Edit code simultaneously with interviewer in shared Monaco editor.
  - View interviewer's live cursor position and presence.
  - Switch programming language (Python, JavaScript).
  - Run code with custom standard input (RUN).
  - Submit code against test cases (SUBMIT).
  - View execution outputs and sample test case verdicts.
  - Monitor the server-authoritative countdown timer.
  - View interview completion status upon interviewer ending or timer expiration.
- **Strict Restrictions**:
  - Never allowed to view or retrieve private interviewer notes.
  - Never allowed to start or end the interview.
  - Never allowed to view hidden test case inputs or expected outputs.
  - Cannot access rooms they have not been explicitly invited to.

---

## 3. Functional Requirements

### 3.1 Interview Lifecycle State Machine
```text
WAITING ──(Interviewer clicks Start)──► ACTIVE ──(Timer expires OR Interviewer ends)──► COMPLETED
```
1. **WAITING**: Room is provisioned; interviewer and candidate can enter. Code editor is editable; timer is idle.
2. **ACTIVE**: Interview is officially underway; server-authoritative timer counts down to `endsAt`. Both participants can run/submit code.
3. **COMPLETED**: Read-only mode enforced. Document state is frozen in PostgreSQL as `finalCode`. WebSocket rejects further document mutations. Execution endpoints reject new jobs.

### 3.2 Real-Time Collaboration
- Monaco Editor integrated with Yjs text CRDT via `y-monaco` and `@hocuspocus/provider`.
- Sub-50ms keystroke synchronization between connected participants.
- Yjs Awareness broadcasting user name, cursor position, selection range, and color.
- Automatic document snapshot persistence to PostgreSQL `YjsDocument` table.
- Automatic document recovery and synchronization upon network reconnection or server restart.

### 3.3 Remote Code Execution Engine
- Asynchronous execution workflow decoupling the web server from the sandbox runtime.
- Background worker daemon polling PostgreSQL for pending jobs using row-level locking (`FOR UPDATE SKIP LOCKED`).
- Worker submits jobs to Judge0 instance via REST API and polls execution tokens.
- Support for Python 3 and JavaScript (Node.js).
- Dual execution modes:
  - **RUN**: Executes code against user-provided `stdin`. Returns `stdout`, `stderr`, runtime, memory.
  - **SUBMIT**: Iterates through all test cases in the database, runs code in Judge0, normalizes output, evaluates pass/fail status, and persists detailed case results.
- Sensitive data isolation: Hidden test inputs and expected outputs are strictly kept server-side and never returned in API responses or WebSocket payloads.

---

## 4. Non-Functional Requirements

### 4.1 Security & Compliance
- No remote code execution on the Next.js API server or WebSocket server.
- SHA-256 hashed invitation tokens with 7-day expiration.
- Strict server-side role validation on every API endpoint and WebSocket connection.
- Rate-limited execution requests (max 1 active execution per session).
- Maximum source code payload (64 KB) and stdin payload (16 KB).

### 4.2 Performance & Reliability
- Next.js Server Components for data fetching and fast TTFB.
- Optimistic UI updates with graceful fallback.
- Database connection pooling with Prisma.
- Zero data loss on disconnection: client-side Yjs state queues offline edits and merges idempotently upon reconnection.
