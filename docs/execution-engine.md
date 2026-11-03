# PairCode — Code Execution Engine & Worker Specification

## 1. Remote Execution Architecture

To ensure isolation, security, and high reliability, PairCode executes untrusted candidate code through a decoupled asynchronous workflow utilizing Judge0.

**Core Rule**: Candidate code is NEVER executed on the Next.js server, Node.js WebSocket server, or any host machine runtime directly.

```text
 ┌───────────────────────┐
 │     Client Click      │
 │    (RUN or SUBMIT)    │
 └───────────┬───────────┘
             │ POST /api/interviews/[id]/executions
             ▼
 ┌────────────────────────────────────────────────────────┐
 │                      apps/web                          │
 │  1. Verify session is ACTIVE                           │
 │  2. Enforce rate limit (1 concurrent job per room)     │
 │  3. Enforce size limits (source <= 64KB, stdin <= 16KB)│
 │  4. Create Execution record (status = PENDING)         │
 │  5. Return HTTP 202 with executionId                   │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼ PostgreSQL Execution table
 ┌────────────────────────────────────────────────────────┐
 │                      apps/worker                       │
 │  1. Atomically claim job via SELECT ... FOR UPDATE     │
 │     SKIP LOCKED (status -> RUNNING, claimedAt -> NOW)  │
 │  2. Load test cases from DB (if SUBMIT)                │
 │  3. Submit to Judge0 async API (obtain token)          │
 │  4. Poll Judge0 token with exponential backoff         │
 │  5. Normalize output, calculate pass/fail results      │
 │  6. Persist execution results & case breakdown         │
 │  7. Update status -> COMPLETED or FAILED               │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼ HTTPS Polling
 ┌────────────────────────────────────────────────────────┐
 │                 Client Poll Engine                     │
 │  1. GET /api/executions/[executionId] every 1.5s       │
 │  2. GET /api/interviews/[id]/active-execution          │
 │  3. Render terminal output, test verdicts, runtime     │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Worker Implementation Details

### 2.1 Concurrency & Atomic Job Claiming
The worker process runs continuously and fetches work via a transactional SQL query:
```sql
UPDATE "Execution"
SET "status" = 'RUNNING',
    "claimedAt" = NOW(),
    "attemptCount" = "attemptCount" + 1
WHERE "id" = (
  SELECT "id"
  FROM "Execution"
  WHERE "status" = 'PENDING'
  ORDER BY "createdAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```
This guarantees that multiple worker instances never process the same execution concurrently and prevents race conditions.

### 2.2 Worker Lease Expiration & Stale Recovery
- A periodic reaper task checks for executions stuck in `RUNNING` status where `claimedAt < NOW() - WORKER_JOB_LEASE_MS` (default: 60,000ms).
- If `attemptCount < WORKER_MAX_ATTEMPTS` (default: 3), the job is reset to `PENDING`.
- If maximum attempts are exceeded, the job is marked `FAILED` with message `"Execution timed out or worker process terminated unexpectedly."`

---

## 3. Judge0 Integration

### 3.1 Supported Languages & Language ID Resolution
PairCode defaults to Judge0 standard language IDs with configurable overrides via environment variables:
- **Python 3**: Default Judge0 ID `71` (Python 3.8+) or `92` (Python 3.11). Configurable via `JUDGE0_LANGUAGE_ID_PYTHON`.
- **JavaScript (Node.js)**: Default Judge0 ID `63` (Node.js 12+) or `93` (Node.js 18+). Configurable via `JUDGE0_LANGUAGE_ID_JAVASCRIPT`.

### 3.2 Asynchronous Submission Workflow
1. Worker sends POST to `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=false`.
2. Headers include `X-Auth-Token: ${JUDGE0_API_KEY}` if authenticated.
3. Payload specifies:
   - `source_code`: Source string.
   - `language_id`: Target language ID.
   - `stdin`: Input string.
   - `cpu_time_limit`: `EXECUTION_CPU_TIME_LIMIT` (default: 5.0s).
   - `wall_time_limit`: `EXECUTION_WALL_TIME_LIMIT` (default: 10.0s).
   - `memory_limit`: `EXECUTION_MEMORY_LIMIT_KB` (default: 128,000 KB / 128 MB).
4. Response yields a token: `{ "token": "uuid-token" }`.
5. Worker polls `GET ${JUDGE0_BASE_URL}/submissions/{token}?base64_encoded=false` until Judge0 status ID indicates completion (Status ID > 2).

### 3.3 Status Code Mapping
| Judge0 Status ID | Judge0 Description | PairCode Case Status |
|---|---|---|
| 3 | Accepted | `ACCEPTED` |
| 4 | Wrong Answer | `WRONG_ANSWER` |
| 5 | Time Limit Exceeded | `TIME_LIMIT_EXCEEDED` |
| 6 | Compilation Error | `COMPILATION_ERROR` |
| 7, 8, 9, 10, 11, 12 | Runtime Error | `RUNTIME_ERROR` |
| 13 | Internal Error | `FAILED` |
| 14 | Exec Format Error | `FAILED` |

---

## 4. RUN vs SUBMIT Workflows

### 4.1 RUN Mode
- Runs user's active code against provided standard input (or empty input).
- Evaluates a single execution pass.
- Returns stdout, stderr, compile error, execution time, and memory usage.
- Stored in database as `Execution` with `kind = RUN`.

### 4.2 SUBMIT Mode
- Fetches all test cases for the interview's question ordered by `order ASC`.
- Submits each test case sequentially (or bounded parallel in batches of 3) to Judge0.
- Evaluates actual stdout against `TestCase.expectedOutput`.
- **Output Normalization**:
  - Strips carriage returns (`\r\n` -> `\n`).
  - Trims trailing whitespace per line and trailing newlines.
  - Does NOT alter internal spaces or indentation.
- Records individual `ExecutionCaseResult` entries.
- If all test cases pass: status `COMPLETED`, verdict `ACCEPTED`.
- If any test case fails: verdict reflects the first failure (`WRONG_ANSWER`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`).
- **Hidden Test Case Protection**:
  - For cases where `isHidden = true`, the worker verifies the output internally.
  - The API sanitizes `stdout` and `stderr` to `null` before sending to the client, preventing candidates from reverse-engineering hidden test suites.
