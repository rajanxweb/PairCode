import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setMockTestUser } from '../../apps/web/lib/auth/server.js';
import { prisma } from '../../apps/web/lib/db.js';
import { GET as getQuestionById } from '../../apps/web/app/api/questions/[id]/route.js';
import { GET as getExecutionById } from '../../apps/web/app/api/executions/[executionId]/route.js';
import { POST as queueExecution } from '../../apps/web/app/api/interviews/[id]/executions/route.js';
import { GET as getNotes, PUT as putNotes } from '../../apps/web/app/api/interviews/[id]/notes/route.js';

describe('Security & Authorization Boundary Tests', () => {
  const interviewerUser = {
    id: 'user_host_1',
    clerkUserId: 'clerk_host_1',
    email: 'host@paircode.test',
    name: 'Host Interviewer',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const candidateUser = {
    id: 'user_candidate_2',
    clerkUserId: 'clerk_cand_2',
    email: 'cand@paircode.test',
    name: 'Candidate User',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const strangerUser = {
    id: 'user_stranger_3',
    clerkUserId: 'clerk_stranger_3',
    email: 'stranger@paircode.test',
    name: 'Stranger User',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hidden Test Case Secrecy', () => {
    it('never exposes hidden test cases in question detail endpoint', async () => {
      setMockTestUser(candidateUser);

      vi.spyOn(prisma.question, 'findFirst').mockResolvedValueOnce({
        id: 'q_1',
        slug: 'two-sum',
        title: 'Two Sum',
        statement: 'Solve two sum',
        difficulty: 'EASY',
        topics: ['Arrays'],
        constraints: [],
        examples: [],
        starterCode: {},
        testCases: [
          { id: 'tc_public', input: 'sample in', expectedOutput: 'sample out', order: 1 },
        ],
      } as any);

      const req = new NextRequest('http://localhost:3000/api/questions/two-sum');
      const res = await getQuestionById(req, { params: Promise.resolve({ id: 'two-sum' }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.question.sampleCases).toHaveLength(1);
      expect(data.question.sampleCases[0].id).toBe('tc_public');
      // Verify no isHidden: true or raw hidden cases exist
      expect(JSON.stringify(data)).not.toContain('tc_hidden');
    });

    it('sanitizes stdout and stderr for hidden test cases in execution endpoint', async () => {
      setMockTestUser(candidateUser);

      const mockExecution = {
        id: 'exec_1',
        sessionId: 'sess_1',
        kind: 'SUBMIT',
        language: 'python',
        status: 'COMPLETED',
        totalPassed: 1,
        totalFailed: 1,
        errorMessage: 'Wrong answer on test case 2',
        startedAt: new Date(),
        finishedAt: new Date(),
        session: {
          interviewerId: interviewerUser.id,
          candidateId: candidateUser.id,
        },
        caseResults: [
          {
            id: 'cr_1',
            caseNumber: 1,
            isHidden: false,
            status: 'ACCEPTED',
            stdout: 'sample output\n',
            stderr: null,
            executionTimeMs: 25,
            memoryKb: 8000,
          },
          {
            id: 'cr_2',
            caseNumber: 2,
            isHidden: true,
            status: 'WRONG_ANSWER',
            stdout: 'SECRET LEAKABLE STDOUT',
            stderr: 'SECRET TRACEBACK',
            executionTimeMs: 30,
            memoryKb: 8100,
          },
        ],
      };

      vi.spyOn(prisma.execution, 'findUnique').mockResolvedValueOnce(mockExecution as any);

      const req = new NextRequest('http://localhost:3000/api/executions/exec_1');
      const res = await getExecutionById(req, { params: Promise.resolve({ executionId: 'exec_1' }) });
      expect(res.status).toBe(200);

      const data = await res.json();
      const cases = data.execution.caseResults;
      expect(cases[0].stdout).toBe('sample output\n');
      // Critical check: hidden test case output MUST be nullified
      expect(cases[1].stdout).toBeNull();
      expect(cases[1].stderr).toBeNull();
      expect(JSON.stringify(data)).not.toContain('SECRET LEAKABLE STDOUT');
      expect(JSON.stringify(data)).not.toContain('SECRET TRACEBACK');
    });
  });

  describe('Payload Size Enforcements', () => {
    it('rejects source code exceeding maximum allowed size (64KB)', async () => {
      setMockTestUser(candidateUser);

      vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValueOnce({
        id: 'sess_1',
        interviewerId: interviewerUser.id,
        candidateId: candidateUser.id,
        status: 'ACTIVE',
      } as any);

      const hugeCode = 'a'.repeat(70000); // 70 KB > 64 KB limit

      const req = new NextRequest('http://localhost:3000/api/interviews/sess_1/executions', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'RUN',
          language: 'python',
          sourceCode: hugeCode,
          stdin: '',
        }),
      });

      const res = await queueExecution(req, { params: Promise.resolve({ id: 'sess_1' }) });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects standard input exceeding maximum allowed size (16KB)', async () => {
      setMockTestUser(candidateUser);

      vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValueOnce({
        id: 'sess_1',
        interviewerId: interviewerUser.id,
        candidateId: candidateUser.id,
        status: 'ACTIVE',
      } as any);

      const hugeStdin = 'b'.repeat(20000); // 20 KB > 16 KB limit

      const req = new NextRequest('http://localhost:3000/api/interviews/sess_1/executions', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'RUN',
          language: 'python',
          sourceCode: 'print(1)',
          stdin: hugeStdin,
        }),
      });

      const res = await queueExecution(req, { params: Promise.resolve({ id: 'sess_1' }) });
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Session Access Authorization', () => {
    it('rejects unauthenticated users with 401', async () => {
      setMockTestUser(null);

      const req = new NextRequest('http://localhost:3000/api/interviews/sess_1/executions', {
        method: 'POST',
        body: JSON.stringify({ kind: 'RUN', language: 'python', sourceCode: 'print(1)' }),
      });

      const res = await queueExecution(req, { params: Promise.resolve({ id: 'sess_1' }) });
      expect(res.status).toBe(401);
    });

    it('rejects non-participants with 403 Forbidden', async () => {
      setMockTestUser(strangerUser);

      vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValueOnce({
        id: 'sess_1',
        interviewerId: interviewerUser.id,
        candidateId: candidateUser.id,
        status: 'ACTIVE',
      } as any);

      const req = new NextRequest('http://localhost:3000/api/interviews/sess_1/executions', {
        method: 'POST',
        body: JSON.stringify({ kind: 'RUN', language: 'python', sourceCode: 'print(1)' }),
      });

      const res = await queueExecution(req, { params: Promise.resolve({ id: 'sess_1' }) });
      expect(res.status).toBe(403);
    });
  });
});

