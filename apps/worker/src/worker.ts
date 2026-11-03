import { PrismaClient, Execution } from '@prisma/client';
import { Judge0Client } from './judge0.js';
import { evaluateTestCaseOutput, mapJudge0StatusToCaseStatus } from './evaluator.js';

export class ExecutionWorker {
  private prisma: PrismaClient;
  private judge0: Judge0Client;
  private isRunning = false;
  private pollIntervalMs: number;
  private leaseMs: number;
  private maxAttempts: number;

  constructor(prismaClient?: PrismaClient, judge0Client?: Judge0Client) {
    this.prisma = prismaClient || new PrismaClient();
    this.judge0 = judge0Client || new Judge0Client();
    this.pollIntervalMs = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '1000', 10);
    this.leaseMs = parseInt(process.env.WORKER_JOB_LEASE_MS || '60000', 10);
    this.maxAttempts = parseInt(process.env.WORKER_MAX_ATTEMPTS || '3', 10);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('[Worker] Daemon started. Polling for pending executions...');

    while (this.isRunning) {
      try {
        await this.recoverStaleJobs();
        const job = await this.claimJob();
        if (job) {
          console.log(`[Worker] Claimed execution job: ${job.id} (kind: ${job.kind})`);
          await this.processJob(job);
        } else {
          await new Promise((res) => setTimeout(res, this.pollIntervalMs));
        }
      } catch (err) {
        console.error('[Worker] Polling loop error:', err);
        await new Promise((res) => setTimeout(res, this.pollIntervalMs));
      }
    }
  }

  stop(): void {
    this.isRunning = false;
    console.log('[Worker] Stopping execution daemon...');
  }

  async claimJob(): Promise<Execution | null> {
    try {
      // PostgreSQL atomic FOR UPDATE SKIP LOCKED
      const jobs = await this.prisma.$queryRaw<Execution[]>`
        UPDATE "Execution"
        SET "status" = 'RUNNING'::"ExecutionStatus",
            "claimedAt" = NOW(),
            "attemptCount" = "attemptCount" + 1
        WHERE "id" = (
          SELECT "id"
          FROM "Execution"
          WHERE "status" = 'PENDING'::"ExecutionStatus"
          ORDER BY "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING *;
      `;
      return jobs && jobs.length > 0 ? jobs[0] : null;
    } catch {
      // Fallback for mock/non-postgres test drivers
      const pending = await this.prisma.execution.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      if (!pending) return null;

      return await this.prisma.execution.update({
        where: { id: pending.id },
        data: {
          status: 'RUNNING',
          claimedAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });
    }
  }

  async recoverStaleJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - this.leaseMs);
    const staleJobs = await this.prisma.execution.findMany({
      where: {
        status: 'RUNNING',
        claimedAt: { lt: cutoff },
      },
    });

    for (const job of staleJobs) {
      if (job.attemptCount < this.maxAttempts) {
        console.warn(`[Worker] Reclaiming stale job ${job.id} (attempt ${job.attemptCount}/${this.maxAttempts})`);
        await this.prisma.execution.update({
          where: { id: job.id },
          data: { status: 'PENDING', claimedAt: null },
        });
      } else {
        console.error(`[Worker] Job ${job.id} exceeded maximum retry attempts. Marking as FAILED.`);
        await this.prisma.execution.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Execution timed out or worker process terminated unexpectedly.',
          },
        });
      }
    }
  }

  async processJob(job: Execution): Promise<void> {
    const startedAt = new Date();
    await this.prisma.execution.update({
      where: { id: job.id },
      data: { startedAt },
    });

    try {
      const languageId = this.judge0.getLanguageId(job.language);

      if (job.kind === 'RUN') {
        // Execute against user-supplied stdin
        const token = await this.judge0.submit({
          source_code: job.sourceCode,
          language_id: languageId,
          stdin: job.stdin || '',
        });

        const result = await this.judge0.pollResult(token);
        const status = result.status.id === 3 ? 'COMPLETED' : 'FAILED';
        const errorMessage =
          result.status.id !== 3 ? result.compile_output || result.stderr || result.message || result.status.description : null;

        await this.prisma.execution.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            totalPassed: result.status.id === 3 ? 1 : 0,
            totalFailed: result.status.id === 3 ? 0 : 1,
            errorMessage,
            finishedAt: new Date(),
          },
        });

        // Record single case result for RUN
        await this.prisma.executionCaseResult.create({
          data: {
            executionId: job.id,
            caseNumber: 1,
            isHidden: false,
            status: mapJudge0StatusToCaseStatus(result.status.id),
            stdout: result.stdout || null,
            stderr: result.stderr || result.compile_output || result.message || null,
            executionTimeMs: result.time ? parseFloat(result.time) * 1000 : null,
            memoryKb: result.memory || null,
          },
        });
      } else if (job.kind === 'SUBMIT') {
        // Fetch all test cases for question
        const session = await this.prisma.interviewSession.findUnique({
          where: { id: job.sessionId },
          include: {
            question: {
              include: {
                testCases: { orderBy: { order: 'asc' } },
              },
            },
          },
        });

        if (!session || !session.question.testCases.length) {
          throw new Error('No test cases configured for this question.');
        }

        let passedCount = 0;
        let failedCount = 0;
        let firstErrorMessage: string | null = null;

        for (const tc of session.question.testCases) {
          const token = await this.judge0.submit({
            source_code: job.sourceCode,
            language_id: languageId,
            stdin: tc.input,
          });

          const result = await this.judge0.pollResult(token);
          const evaluation = evaluateTestCaseOutput(result, tc.expectedOutput);

          if (evaluation.status === 'ACCEPTED') {
            passedCount++;
          } else {
            failedCount++;
            if (!firstErrorMessage) {
              firstErrorMessage = evaluation.stderr || `Failed on test case ${tc.order}`;
            }
          }

          await this.prisma.executionCaseResult.create({
            data: {
              executionId: job.id,
              testCaseId: tc.id,
              caseNumber: tc.order,
              isHidden: tc.isHidden,
              status: evaluation.status,
              stdout: evaluation.stdout,
              stderr: evaluation.stderr,
              executionTimeMs: evaluation.executionTimeMs,
              memoryKb: evaluation.memoryKb,
            },
          });
        }

        await this.prisma.execution.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            totalPassed: passedCount,
            totalFailed: failedCount,
            errorMessage: firstErrorMessage,
            finishedAt: new Date(),
          },
        });
      }
    } catch (err: any) {
      console.error(`[Worker] Error processing job ${job.id}:`, err);
      await this.prisma.execution.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Execution failed due to sandbox error.',
          finishedAt: new Date(),
        },
      });
    }
  }
}

