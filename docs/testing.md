# PairCode — Testing Strategy & Verification Plan

## 1. Testing Philosophy

Testing is a core quality gate in PairCode. No feature is marked complete based solely on compilation. The application employs a tiered testing pyramid:
1. **Unit Tests (Vitest)**: Pure domain functions, token hashing, output normalizers, Zod schemas, state transitions.
2. **Integration Tests (Vitest)**: REST API routes, Prisma database interactions, worker job claiming, Judge0 mock client.
3. **Realtime Tests (Vitest & Hocuspocus)**: Dual Yjs client convergence, awareness broadcasting, reconnection, persistence.
4. **End-to-End Tests (Playwright)**: Full multi-user browser tests with separate browser contexts for Interviewer and Candidate.

---

## 2. Test Execution Commands

```bash
# Run all unit tests
pnpm test

# Run backend API integration tests
pnpm test:integration

# Run real-time collaboration tests
pnpm test:realtime

# Run Playwright end-to-end browser tests
pnpm test:e2e

# Run all checks (typecheck, lint, test, build)
pnpm check:all
```

---

## 3. Test Suites Breakdown

### 3.1 Unit Testing (`packages/shared` & `apps/web/lib`)
- **Token Security**:
  - Validates cryptographic randomness of generated invite tokens.
  - Verifies SHA-256 hash generation is deterministic and non-reversible.
  - Validates expiration check functions.
- **Output Normalization**:
  - Tests normalization of CRLF (`\r\n`) to LF (`\n`).
  - Tests removal of trailing whitespace without truncating internal formatting.
- **State Machine**:
  - Verifies valid transitions (`WAITING` -> `ACTIVE` -> `COMPLETED`).
  - Verifies invalid transitions (e.g. `COMPLETED` -> `ACTIVE` or `WAITING` -> `COMPLETED`) throw errors.
- **Judge0 Status Mapping**:
  - Maps Judge0 status codes (3, 4, 5, 6, etc.) to PairCode statuses.

### 3.2 Integration Testing (`apps/web` & `apps/worker`)
- **API Endpoints**:
  - `POST /api/interviews`: Creates interview and returns one-time invite token.
  - `POST /api/invitations/[token]/accept`: Binds candidate and rejects duplicate candidates.
  - `POST /api/interviews/[id]/start`: Changes status to ACTIVE and calculates `endsAt`.
  - `POST /api/interviews/[id]/end`: Freezes code and sets status to COMPLETED.
  - `GET /api/interviews/[id]/notes`: 200 for Interviewer, 403 Forbidden for Candidate.
  - `GET /api/questions/[id]`: Verifies hidden test cases are never present in payload.
- **Worker Queue**:
  - Creates pending `Execution` records.
  - Simulates worker polling and atomic claiming using transaction locking.
  - Verifies worker timeout handling and retry limits.

### 3.3 Real-time Collaboration Testing (`apps/realtime`)
- Launches local Hocuspocus test server on dedicated port.
- Initializes two Yjs client providers: Client A (Interviewer) and Client B (Candidate).
- Asserts that text typed by Client A appears identically in Client B.
- Asserts that concurrent edits at different character offsets merge without loss.
- Asserts awareness state updates when Client A changes cursor position.
- Tests server restart and recovery of state from `YjsDocument` mock store.

### 3.4 Worker Testing with Fake Judge0 Provider
- Simulates Judge0 HTTP server locally during tests:
  - Returns `token` on POST.
  - Emulates accepted code execution (status 3).
  - Emulates compilation error (status 6).
  - Emulates runtime error / exception (status 11).
  - Emulates time limit exceeded (status 5).
- Proves worker evaluates outputs and updates PostgreSQL records accurately.

### 3.5 Playwright End-to-End Testing (`tests/e2e`)
- Launches dual browser contexts (Incognito context 1 for Interviewer, Incognito context 2 for Candidate).
- Scenario:
  1. Interviewer logs in and creates interview session.
  2. Copies invitation URL.
  3. Candidate opens invitation URL in second browser context and accepts.
  4. Interviewer starts interview.
  5. Both open interview room.
  6. Candidate types Python solution into Monaco editor.
  7. Interviewer observes live code typing.
  8. Candidate clicks RUN; both observe live execution status in terminal.
  9. Interviewer writes private note; confirms note is saved.
  10. Candidate DOM is inspected to confirm note is not present.
  11. Interviewer clicks End Interview.
  12. Both browsers transition to Completed state; final code is recorded in history.
