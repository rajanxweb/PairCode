import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifySessionParticipant } from '@/lib/auth/server';
import { executionRequestSchema } from '@paircode/shared';

export async function POST(
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

    if (session.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Cannot execute code when interview status is ${session.status}.`,
          },
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const parseResult = executionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid execution request payload.',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { kind, language, sourceCode, stdin } = parseResult.data;

    // Concurrency check: only 1 active execution per room at a time
    const activeJob = await prisma.execution.findFirst({
      where: {
        sessionId: session.id,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (activeJob) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'An execution is already in progress. Please wait for it to complete.',
          },
        },
        { status: 429 }
      );
    }

    const execution = await prisma.execution.create({
      data: {
        sessionId: session.id,
        requestedByUserId: user.id,
        kind,
        language,
        sourceCode,
        stdin: stdin || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        executionId: execution.id,
        status: execution.status,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[API POST /api/interviews/[id]/executions] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to queue execution job.' } },
      { status: 500 }
    );
  }
}

