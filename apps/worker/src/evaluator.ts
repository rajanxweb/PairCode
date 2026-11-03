import { normalizeOutput, CaseStatus } from '@paircode/shared';
import type { Judge0Result } from './judge0.js';

export function mapJudge0StatusToCaseStatus(judge0StatusId: number): CaseStatus {
  switch (judge0StatusId) {
    case 3:
      return 'ACCEPTED';
    case 4:
      return 'WRONG_ANSWER';
    case 5:
      return 'TIME_LIMIT_EXCEEDED';
    case 6:
      return 'COMPILATION_ERROR';
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
      return 'RUNTIME_ERROR';
    default:
      return 'FAILED';
  }
}

export function evaluateTestCaseOutput(
  result: Judge0Result,
  expectedOutput: string
): {
  status: CaseStatus;
  stdout: string | null;
  stderr: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
} {
  const executionTimeMs = result.time ? parseFloat(result.time) * 1000 : null;
  const memoryKb = result.memory || null;
  const stdout = result.stdout || null;
  const stderr = result.stderr || result.compile_output || result.message || null;

  // If Judge0 reported an error status (runtime error, compile error, TLE)
  if (result.status.id !== 3 && result.status.id !== 4) {
    return {
      status: mapJudge0StatusToCaseStatus(result.status.id),
      stdout,
      stderr,
      executionTimeMs,
      memoryKb,
    };
  }

  // Judge0 executed without fatal runtime error — compare normalized stdout with expectedOutput
  const normActual = normalizeOutput(stdout || '');
  const normExpected = normalizeOutput(expectedOutput || '');

  const passed = normActual === normExpected;

  return {
    status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    stdout,
    stderr,
    executionTimeMs,
    memoryKb,
  };
}

