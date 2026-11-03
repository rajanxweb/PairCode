# PairCode — Database Design & Schema Specification

## 1. Relational Entity-Relationship Diagram

```text
 ┌───────────────┐           ┌──────────────────┐           ┌──────────────┐
 │     User      │           │ InterviewSession │◄──────────┤ InterviewNote│
 ├───────────────┤           ├──────────────────┤           ├──────────────┤
 │ id (PK)       │1         *│ id (PK)          │1         1│ id (PK)      │
 │ clerkUserId   ├──────────►│ roomCode (UQ)    ├──────────►│ sessionId    │
 │ email         │(as Host)  │ interviewerId    │           │ interviewerId│
 │ name          │           │ candidateId      │           │ content      │
 └───────┬───────┘           │ questionId       │           └──────────────┘
         │                   │ status           │
         │1                  │ startedAt        │           ┌──────────────┐
         │                   │ endsAt           │1         1│ YjsDocument  │
         │(as Candidate)     │ finalCode        ├──────────►├──────────────┤
         │                   └─────────┬────────┘           │ id (PK)      │
         ▼*                            │                    │ sessionId(UQ)│
 ┌───────────────┐                     │1                   │ state(Bytes) │
 │ (Session Cand)│                     │                    └──────────────┘
 └───────────────┘                     ▼*
                             ┌──────────────────┐           ┌────────────────────┐
                             │    Execution     │1         *│ ExecutionCaseResult│
                             ├──────────────────┼──────────►├────────────────────┤
                             │ id (PK)          │           │ id (PK)            │
                             │ sessionId        │           │ executionId        │
 ┌───────────────┐           │ kind             │           │ caseNumber         │
 │   Question    │           │ status           │           │ isHidden           │
 ├───────────────┤1         *│ sourceCode       │           │ status             │
 │ id (PK)       ├──────────►│ language         │           │ stdout             │
 │ slug (UQ)     │           │ stdin            │           │ stderr             │
 │ title         │           │ totalPassed      │           │ executionTimeMs    │
 │ statement     │           │ totalFailed      │           │ memoryKb           │
 │ starterCode   │           └──────────────────┘           └────────────────────┘
 └───────┬───────┘
         │1
         │*
         ▼
 ┌───────────────┐
 │   TestCase    │
 ├───────────────┤
 │ id (PK)       │
 │ questionId    │
 │ input         │
 │ expectedOutput│
 │ isHidden      │
 │ order         │
 └───────────────┘
```

---

## 2. Table Specifications & Fields

### 2.1 `User`
Stores authenticated users synchronized from Clerk.
- `id`: String (UUID or CUID, Primary Key)
- `clerkUserId`: String (Unique, Indexed)
- `email`: String (Unique)
- `name`: String
- `imageUrl`: String (Nullable)
- `createdAt`: DateTime (default: `now()`)
- `updatedAt`: DateTime (updatedAt: `true`)

### 2.2 `Question`
Stores coding questions with starter code templates in multiple languages.
- `id`: String (UUID or CUID, Primary Key)
- `slug`: String (Unique, Indexed)
- `title`: String
- `statement`: String (Markdown formatted)
- `difficulty`: Enum (`EASY`, `MEDIUM`, `HARD`)
- `topics`: String[] (Scalar list, e.g. `["Arrays", "Two-Pointers"]`)
- `constraints`: String[]
- `examples`: Json (Array of input, output, explanation)
- `starterCode`: Json (Key-value map of language -> starter code string)
- `createdAt`: DateTime (default: `now()`)
- `updatedAt`: DateTime (updatedAt: `true`)

### 2.3 `TestCase`
Stores test cases associated with questions.
- `id`: String (UUID or CUID, Primary Key)
- `questionId`: String (Foreign Key -> `Question.id`, Cascade Delete, Indexed)
- `input`: String (Stdin format)
- `expectedOutput`: String (Expected stdout)
- `isHidden`: Boolean (default: `false`, sample cases are false, hidden test suite cases are true)
- `order`: Int (Ordering index)
- `createdAt`: DateTime (default: `now()`)

### 2.4 `InterviewSession`
Stores the central interview room state and lifecycle.
- `id`: String (UUID or CUID, Primary Key)
- `roomCode`: String (Unique, 8-character alphanumeric room identifier, Indexed)
- `title`: String
- `status`: Enum (`WAITING`, `ACTIVE`, `COMPLETED`, default: `WAITING`, Indexed)
- `interviewerId`: String (Foreign Key -> `User.id`, Indexed)
- `candidateId`: String (Nullable, Foreign Key -> `User.id`, Indexed)
- `questionId`: String (Foreign Key -> `Question.id`, Indexed)
- `durationSeconds`: Int (Duration of active interview, default: 3600)
- `startedAt`: DateTime (Nullable, timestamp when status changed to ACTIVE)
- `endsAt`: DateTime (Nullable, computed server-authoritative deadline)
- `endedAt`: DateTime (Nullable, timestamp when interview finished)
- `inviteTokenHash`: String (Unique, SHA-256 hash of random secret invite token)
- `inviteExpiresAt`: DateTime (Invitation expiration timestamp, default: 7 days)
- `inviteAcceptedAt`: DateTime (Nullable)
- `finalCode`: String (Nullable, captured snapshot upon interview completion)
- `finalLanguage`: String (Nullable, language used upon completion)
- `createdAt`: DateTime (default: `now()`)
- `updatedAt`: DateTime (updatedAt: `true`)

### 2.5 `YjsDocument`
Stores binary snapshots of the collaborative Yjs CRDT document.
- `id`: String (UUID or CUID, Primary Key)
- `sessionId`: String (Unique, Foreign Key -> `InterviewSession.id`, Cascade Delete)
- `state`: Bytes (Binary serialized Yjs document state)
- `updatedAt`: DateTime (updatedAt: `true`)

### 2.6 `InterviewNote`
Private notes written exclusively by the interviewer.
- `id`: String (UUID or CUID, Primary Key)
- `sessionId`: String (Foreign Key -> `InterviewSession.id`, Cascade Delete, Indexed)
- `interviewerId`: String (Foreign Key -> `User.id`, Indexed)
- `content`: Json (Structured feedback object: approach, technical, communication, strengths, areasForImprovement, overall)
- `createdAt`: DateTime (default: `now()`)
- `updatedAt`: DateTime (updatedAt: `true`)
- **Constraint**: `@@unique([sessionId, interviewerId])`

### 2.7 `Execution`
Tracks asynchronous execution jobs.
- `id`: String (UUID or CUID, Primary Key)
- `sessionId`: String (Foreign Key -> `InterviewSession.id`, Cascade Delete, Indexed)
- `requestedByUserId`: String (Foreign Key -> `User.id`, Indexed)
- `kind`: Enum (`RUN`, `SUBMIT`)
- `language`: String (`python`, `javascript`)
- `sourceCode`: String (Max 64 KB)
- `stdin`: String (Nullable, Max 16 KB)
- `status`: Enum (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, default: `PENDING`, Indexed)
- `totalPassed`: Int (default: 0)
- `totalFailed`: Int (default: 0)
- `errorMessage`: String (Nullable)
- `claimedAt`: DateTime (Nullable, worker leasing timestamp)
- `attemptCount`: Int (default: 0)
- `startedAt`: DateTime (Nullable)
- `finishedAt`: DateTime (Nullable)
- `createdAt`: DateTime (default: `now()`, Indexed)

### 2.8 `ExecutionCaseResult`
Detailed per-test-case results from an execution.
- `id`: String (UUID or CUID, Primary Key)
- `executionId`: String (Foreign Key -> `Execution.id`, Cascade Delete, Indexed)
- `testCaseId`: String (Nullable, Foreign Key -> `TestCase.id`)
- `caseNumber`: Int
- `isHidden`: Boolean
- `status`: Enum (`ACCEPTED`, `WRONG_ANSWER`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `FAILED`)
- `stdout`: String (Nullable, nullified for hidden cases when requested by candidate)
- `stderr`: String (Nullable)
- `executionTimeMs`: Float (Nullable)
- `memoryKb`: Int (Nullable)
- `createdAt`: DateTime (default: `now()`)

---

## 3. Database Indexes & Constraints Plan
1. `User.clerkUserId` UNIQUE INDEX.
2. `InterviewSession.roomCode` UNIQUE INDEX.
3. `InterviewSession.inviteTokenHash` UNIQUE INDEX.
4. `YjsDocument.sessionId` UNIQUE INDEX.
5. `InterviewNote (sessionId, interviewerId)` UNIQUE INDEX.
6. `Execution (status, createdAt)` COMPOSITE INDEX for fast worker queue polling.
7. Foreign key indexes on all relation fields to ensure efficient join queries.
