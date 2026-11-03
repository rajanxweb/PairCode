import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionWorker } from '../../apps/worker/src/worker.js';
import { Judge0Client, Judge0Result } from '../../apps/worker/src/judge0.js';
import { evaluateTestCaseOutput, mapJudge0StatusToCaseStatus } from '../../apps/worker/src/evaluator.js';
import type { Execution } from '@prisma/client';

describe('Code Execution Engine & Worker Tests', () => {
  describe('Evaluator & Status Mapping', () => {
    it('maps Judge0 status IDs correctly to PairCode CaseStatus', () => {
      expect(mapJudge0StatusToCaseStatus(3)).toBe('ACCEPTED');
      expect(mapJudge0StatusToCaseStatus(4)).toBe('WRONG_ANSWER');
      expect(mapJudge0StatusToCaseStatus(5)).toBe('TIME_LIMIT_EXCEEDED');
      expect(mapJudge0StatusToCaseStatus(6)).toBe('COMPILATION_ERROR');
      expect(mapJudge0StatusToCaseStatus(11)).toBe('RUNTIME_ERROR');
      expect(mapJudge0StatusToCaseStatus(13)).toBe('FAILED');
    });

    it('evaluates accepted test cases when normalized output matches expected', () => {
      const mockResult: Judge0Result = {
        stdout: '0 1\r\n',
        stderr: null,
        compile_output: null,
        message: null,
        time: '0.045',
        memory: 12300,
        status: { id: 3, description: 'Accepted' },
      };

      const evalResult = evaluateTestCaseOutput(mockResult, '0 1');
      expect(evalResult.status).toBe('ACCEPTED');
      expect(evalResult.stdout).toBe('0 1\r\n');
      expect(evalResult.executionTimeMs).toBe(45);
    });

    it('flags WRONG_ANSWER when actual output differs from expected output', () => {
      const mockResult: Judge0Result = {
        stdout: '0 2\n',
        stderr: null,
        compile_output: null,
        message: null,
        time: '0.040',
        memory: 12000,
        status: { id: 3, description: 'Accepted' },
      };

      const evalResult = evaluateTestCaseOutput(mockResult, '0 1');
      expect(evalResult.status).toBe('WRONG_ANSWER');
    });

    it('flags COMPILATION_ERROR with compile output', () => {
      const mockResult: Judge0Result = {
        stdout: null,
        stderr: null,
        compile_output: 'SyntaxError: unexpected token',
        message: null,
        time: null,
        memory: null,
        status: { id: 6, description: 'Compilation Error' },
      };

      const evalResult = evaluateTestCaseOutput(mockResult, '0 1');
      expect(evalResult.status).toBe('COMPILATION_ERROR');
      expect(evalResult.stderr).toContain('SyntaxError');
    });

    it('flags TIME_LIMIT_EXCEEDED when sandbox times out', () => {
      const mockResult: Judge0Result = {
        stdout: null,
        stderr: null,
        compile_output: null,
        message: 'Time Limit Exceeded',
        time: '5.002',
        memory: 14000,
        status: { id: 5, description: 'Time Limit Exceeded' },
      };

      const evalResult = evaluateTestCaseOutput(mockResult, '0 1');
      expect(evalResult.status).toBe('TIME_LIMIT_EXCEEDED');
    });
  });

  describe('Worker Job Processing with Mock Judge0 Provider', () => {
    let mockPrisma: any;
    let mockJudge0: any;
    let worker: ExecutionWorker;

    beforeEach(() => {
      mockPrisma = {
        execution: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
        },
        executionCaseResult: {
          create: vi.fn(),
        },
        interviewSession: {
          findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
      };

      mockJudge0 = {
        getLanguageId: vi.fn().mockReturnValue(71),
        submit: vi.fn().mockResolvedValue('fake_token_123'),
        pollResult: vi.fn(),
      };

      worker = new ExecutionWorker(mockPrisma as any, mockJudge0 as any);
    });

    it('processes RUN job successfully and persists stdout and runtime', async () => {
      const runJob: Execution = {
        id: 'exec_run_1',
        sessionId: 'sess_1',
        requestedByUserId: 'user_1',
        kind: 'RUN',
        language: 'python',
        sourceCode: 'print("Hello from test")',
        stdin: '',
        status: 'RUNNING',
        totalPassed: 0,
        totalFailed: 0,
        errorMessage: null,
        claimedAt: new Date(),
        attemptCount: 1,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date(),
      };

      mockJudge0.pollResult.mockResolvedValueOnce({
        stdout: 'Hello from test\n',
        stderr: null,
        compile_output: null,
        message: null,
        time: '0.025',
        memory: 9800,
        status: { id: 3, description: 'Accepted' },
      });

      await worker.processJob(runJob);

      expect(mockJudge0.submit).toHaveBeenCalledWith({
        source_code: runJob.sourceCode,
        language_id: 71,
        stdin: '',
      });

      expect(mockPrisma.execution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: runJob.id },
          data: expect.objectContaining({
            status: 'COMPLETED',
            totalPassed: 1,
            totalFailed: 0,
          }),
        })
      );

      expect(mockPrisma.executionCaseResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          executionId: runJob.id,
          status: 'ACCEPTED',
          stdout: 'Hello from test\n',
        }),
      });
    });

    it('processes SUBMIT job against multiple test cases and records case results', async () => {
      const submitJob: Execution = {
        id: 'exec_submit_1',
        sessionId: 'sess_1',
        requestedByUserId: 'user_1',
        kind: 'SUBMIT',
        language: 'python',
        sourceCode: 'def two_sum(): pass',
        stdin: null,
        status: 'RUNNING',
        totalPassed: 0,
        totalFailed: 0,
        errorMessage: null,
        claimedAt: new Date(),
        attemptCount: 1,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date(),
      };

      mockPrisma.interviewSession.findUnique.mockResolvedValueOnce({
        id: 'sess_1',
        question: {
          testCases: [
            { id: 'tc_1', input: 'input1', expectedOutput: 'ans1', isHidden: false, order: 1 },
            { id: 'tc_2', input: 'input2', expectedOutput: 'ans2', isHidden: true, order: 2 },
          ],
        },
      });

      // First test case passes, second test case fails
      mockJudge0.pollResult
        .mockResolvedValueOnce({
          stdout: 'ans1\n',
          stderr: null,
          compile_output: null,
          message: null,
          time: '0.020',
          memory: 8000,
          status: { id: 3, description: 'Accepted' },
        })
        .mockResolvedValueOnce({
          stdout: 'wrong\n',
          stderr: null,
          compile_output: null,
          message: null,
          time: '0.022',
          memory: 8100,
          status: { id: 3, description: 'Accepted' },
        });

      await worker.processJob(submitJob);

      expect(mockPrisma.executionCaseResult.create).toHaveBeenCalledTimes(2);

      expect(mockPrisma.execution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: submitJob.id },
          data: expect.objectContaining({
            status: 'COMPLETED',
            totalPassed: 1,
            totalFailed: 1,
          }),
        })
      );
    });

    it('recovers stale jobs whose worker lease has expired', async () => {
      const staleJob = {
        id: 'exec_stale_1',
        status: 'RUNNING',
        attemptCount: 1,
        claimedAt: new Date(Date.now() - 120000), // 2 mins ago (lease is 60s)
      };

      mockPrisma.execution.findMany.mockResolvedValueOnce([staleJob]);

      await worker.recoverStaleJobs();

      expect(mockPrisma.execution.update).toHaveBeenCalledWith({
        where: { id: staleJob.id },
        data: { status: 'PENDING', claimedAt: null },
      });
    });

    it('marks stale jobs as FAILED when max attempts are exceeded', async () => {
      const exhaustedJob = {
        id: 'exec_exhausted_1',
        status: 'RUNNING',
        attemptCount: 3, // Max attempts = 3
        claimedAt: new Date(Date.now() - 120000),
      };

      mockPrisma.execution.findMany.mockResolvedValueOnce([exhaustedJob]);

      await worker.recoverStaleJobs();

      expect(mockPrisma.execution.update).toHaveBeenCalledWith({
        where: { id: exhaustedJob.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Execution timed out or worker process terminated unexpectedly.',
        },
      });
    });
  });
});

