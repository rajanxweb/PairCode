import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifySessionParticipant } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const session = await prisma.interviewSession.findFirst({
      where: {
        OR: [{ id }, { roomCode: id }],
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Interview session not found.' } },
        { status: 404 }
      );
    }

    const { isParticipant } = verifySessionParticipant(session, user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You are not a participant in this interview.' } },
        { status: 403 }
      );
    }

    const latestExecution = await prisma.execution.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      include: {
        caseResults: {
          orderBy: { caseNumber: 'asc' },
        },
      },
    });

    if (!latestExecution) {
      return NextResponse.json({ execution: null });
    }

    const sanitizedCaseResults = latestExecution.caseResults.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      isHidden: c.isHidden,
      status: c.status,
      stdout: c.isHidden ? null : c.stdout,
      stderr: c.isHidden ? null : c.stderr,
      executionTimeMs: c.executionTimeMs,
      memoryKb: c.memoryKb,
    }));

    return NextResponse.json({
      execution: {
        id: latestExecution.id,
        sessionId: latestExecution.sessionId,
        kind: latestExecution.kind,
        language: latestExecution.language,
        status: latestExecution.status,
        totalPassed: latestExecution.totalPassed,
        totalFailed: latestExecution.totalFailed,
        errorMessage: latestExecution.errorMessage,
        startedAt: latestExecution.startedAt,
        finishedAt: latestExecution.finishedAt,
        caseResults: sanitizedCaseResults,
      },
    });
  } catch (error) {
    console.error('[API GET /api/interviews/[id]/active-execution] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve active execution.' } },
      { status: 500 }
    );
  }
}

