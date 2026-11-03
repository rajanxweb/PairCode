import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifySessionParticipant } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const { executionId } = await params;

    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        session: true,
        caseResults: {
          orderBy: { caseNumber: 'asc' },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Execution not found.' } },
        { status: 404 }
      );
    }

    const { isParticipant } = verifySessionParticipant(execution.session, user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You are not a participant in this session.' } },
        { status: 403 }
      );
    }

    // Sanitize case results for hidden test cases
    const sanitizedCaseResults = execution.caseResults.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      isHidden: c.isHidden,
      status: c.status,
      // Strip output for hidden test cases to protect test secrets
      stdout: c.isHidden ? null : c.stdout,
      stderr: c.isHidden ? null : c.stderr,
      executionTimeMs: c.executionTimeMs,
      memoryKb: c.memoryKb,
    }));

    return NextResponse.json({
      execution: {
        id: execution.id,
        sessionId: execution.sessionId,
        kind: execution.kind,
        language: execution.language,
        status: execution.status,
        totalPassed: execution.totalPassed,
        totalFailed: execution.totalFailed,
        errorMessage: execution.errorMessage,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        caseResults: sanitizedCaseResults,
      },
    });
  } catch (error) {
    console.error('[API GET /api/executions/[executionId]] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve execution status.' } },
      { status: 500 }
    );
  }
}

