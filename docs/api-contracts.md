# PairCode — API Contracts & Route Specifications

All Next.js Route Handlers (`apps/web/app/api/...`) enforce strict Zod schema validation for request payloads and return consistent JSON structures.

## 1. Standard Error Envelope

Every failed API call returns an HTTP error code (400, 401, 403, 404, 409, 429, 500) with a uniform body:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not authorized to perform this operation.",
    "details": null
  }
}
```

Standard Error Codes:
- `UNAUTHORIZED`: Authentication missing, expired, or invalid.
- `FORBIDDEN`: User lacks permission for the resource.
- `NOT_FOUND`: Requested entity does not exist.
- `VALIDATION_ERROR`: Request payload or parameters failed Zod validation.
- `CONFLICT`: Operation conflicts with current state (e.g. candidate slot occupied, interview ended).
- `RATE_LIMITED`: Too many concurrent execution requests.
- `INTERNAL_ERROR`: Unexpected server error.

---

## 2. API Endpoints

### 2.1 User Profile
#### `GET /api/me`
- **Auth**: Required.
- **Description**: Returns authenticated user profile, syncing with Clerk on first call.
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "usr_cuid123",
      "clerkUserId": "user_2a...",
      "email": "interviewer@example.com",
      "name": "Jane Doe",
      "imageUrl": "https://img.clerk.com/..."
    }
  }
  ```

---

### 2.2 Questions
#### `GET /api/questions`
- **Auth**: Required.
- **Query Params**:
  - `search`: string (optional)
  - `difficulty`: `EASY` | `MEDIUM` | `HARD` (optional)
  - `topic`: string (optional)
  - `page`: integer (default: 1)
  - `limit`: integer (default: 20, max: 50)
- **Response `200 OK`**:
  ```json
  {
    "questions": [
      {
        "id": "q_123",
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "EASY",
        "topics": ["Arrays", "Hash Table"]
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
  }
  ```

#### `GET /api/questions/[id]`
- **Auth**: Required.
- **Description**: Returns full question details, constraints, examples, starter code, and sample test cases only.
- **Security Rule**: Hidden test cases (`isHidden: true`) are strictly omitted.
- **Response `200 OK`**:
  ```json
  {
    "question": {
      "id": "q_123",
      "slug": "two-sum",
      "title": "Two Sum",
      "statement": "Given an array of integers `nums`...",
      "difficulty": "EASY",
      "topics": ["Arrays", "Hash Table"],
      "constraints": ["2 <= nums.length <= 10^4"],
      "examples": [...],
      "starterCode": {
        "python": "def two_sum(nums, target):\n    pass\n",
        "javascript": "function twoSum(nums, target) {\n}\n"
      },
      "sampleCases": [
        { "id": "tc_1", "caseNumber": 1, "input": "[2,7,11,15]\n9", "expectedOutput": "[0,1]" }
      ]
    }
  }
  ```

---

### 2.3 Interviews
#### `POST /api/interviews`
- **Auth**: Required (Interviewer).
- **Body**:
  ```json
  {
    "title": "Frontend Senior Interview",
    "questionId": "q_123",
    "durationSeconds": 3600
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "interview": {
      "id": "sess_123",
      "roomCode": "ABC123XY",
      "title": "Frontend Senior Interview",
      "status": "WAITING",
      "durationSeconds": 3600,
      "inviteUrl": "https://paircode.app/join/raw_token_xyz",
      "createdAt": "2026-11-03T12:00:00Z"
    }
  }
  ```

#### `GET /api/interviews`
- **Auth**: Required.
- **Description**: Returns list of interviews created by or participated in by current user.
- **Response `200 OK`**:
  ```json
  {
    "interviews": [
      {
        "id": "sess_123",
        "roomCode": "ABC123XY",
        "title": "Frontend Senior Interview",
        "status": "WAITING",
        "durationSeconds": 3600,
        "interviewer": { "id": "u1", "name": "Jane" },
        "candidate": null,
        "question": { "id": "q_123", "title": "Two Sum", "difficulty": "EASY" },
        "createdAt": "2026-11-03T12:00:00Z"
      }
    ]
  }
  ```

#### `GET /api/interviews/[id]`
- **Auth**: Required (Participant only).
- **Description**: Retrieves interview session details by session ID or room code.

#### `POST /api/interviews/[id]/start`
- **Auth**: Required (Interviewer only).
- **Validation**: Status must be `WAITING`, Candidate must be assigned.
- **Response `200 OK`**: Updates status to `ACTIVE`, sets `startedAt = NOW()`, computes `endsAt = startedAt + durationSeconds`.

#### `POST /api/interviews/[id]/end`
- **Auth**: Required (Interviewer only).
- **Validation**: Status must be `ACTIVE` or `WAITING`.
- **Response `200 OK`**: Updates status to `COMPLETED`, records `endedAt`, snapshots latest Yjs document into `finalCode` and `finalLanguage`.

---

### 2.4 Invitations
#### `POST /api/invitations/[token]/accept`
- **Auth**: Required (Candidate user).
- **Description**: Accepts invitation, hashes token using SHA-256 to verify against DB, binds candidate slot if unassigned or re-validates existing candidate.
- **Response `200 OK`**: Returns room code and session details for redirect to `/room/[roomCode]`.

#### `POST /api/interviews/[id]/invitation/rotate`
- **Auth**: Required (Interviewer only).
- **Description**: Invalidates previous invite token, creates a new cryptographically random token, hashes and stores it, and returns the new invite URL.

---

### 2.5 Realtime Tokens
#### `POST /api/interviews/[id]/realtime-token`
- **Auth**: Required (Participant only).
- **Description**: Generates a short-lived (15 minutes) signed JWT for authenticating WebSocket connections to Hocuspocus.
- **Claims**: `{ sub: userId, sessionId: id, roomCode, role: "INTERVIEWER"|"CANDIDATE", exp: ... }`

---

### 2.6 Executions
#### `POST /api/interviews/[id]/executions`
- **Auth**: Required (Participant only).
- **Validation**: Status must be `ACTIVE`. Max 1 active execution per session. Source code max 64 KB. Stdin max 16 KB.
- **Body**:
  ```json
  {
    "kind": "RUN", // or "SUBMIT"
    "language": "python", // or "javascript"
    "sourceCode": "def two_sum(nums, target):\n    return [0, 1]",
    "stdin": "[2,7,11,15]\n9" // optional for RUN
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "executionId": "exec_abc123",
    "status": "PENDING"
  }
  ```

#### `GET /api/executions/[executionId]`
- **Auth**: Required (Participant of interview only).
- **Description**: Returns execution status, runtime stats, and test case summaries.
- **Security Rule**: Output of hidden test cases (`isHidden: true`) is sanitized (actual stdout/stderr omitted for candidate; verdict `ACCEPTED`/`WRONG_ANSWER` displayed).

#### `GET /api/interviews/[id]/active-execution`
- **Auth**: Required (Participant only).
- **Description**: Returns the most recently queued or running execution for the interview room so both participants can observe live status.

---

### 2.7 Notes
#### `GET /api/interviews/[id]/notes`
- **Auth**: Required (Interviewer only).
- **Description**: Returns private notes for session. Rejects candidate with 403 Forbidden.

#### `PUT /api/interviews/[id]/notes`
- **Auth**: Required (Interviewer only).
- **Body**:
  ```json
  {
    "content": {
      "approach": "Strong grasp of hash map time complexity...",
      "technical": "Clean modular code...",
      "communication": "Clarified edge cases early...",
      "strengths": "Quick syntax fluency...",
      "areasForImprovement": "Could test negative number edge cases...",
      "overall": "Strong Hire"
    }
  }
  ```
- **Response `200 OK`**: Upserts `InterviewNote` record.

---

### 2.8 History
#### `GET /api/history`
- **Auth**: Required.
- **Description**: Lists completed interviews for the user.

#### `GET /api/history/[sessionId]`
- **Auth**: Required (Participant only).
- **Description**: Returns completed interview report. If the viewer is the interviewer, includes private notes; if candidate, omits notes.
