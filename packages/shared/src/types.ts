export type UserRole = 'INTERVIEWER' | 'CANDIDATE';

export type SessionStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type ExecutionKind = 'RUN' | 'SUBMIT';

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type CaseStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'FAILED';

export type SupportedLanguage = 'python' | 'javascript';

export interface InterviewNoteContent {
  approach: string;
  technical: string;
  communication: string;
  strengths: string;
  areasForImprovement: string;
  overall: string;
}

export interface RealtimeTokenClaims {
  sub: string;
  sessionId: string;
  roomCode: string;
  role: UserRole;
  name: string;
  exp: number;
}

