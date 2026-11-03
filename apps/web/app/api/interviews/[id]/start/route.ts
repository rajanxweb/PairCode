import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyIsInterviewer } from '@/lib/auth/server';

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

    if (!verifyIsInterviewer(session, user.id)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only the interviewer can start this session.' } },
        { status: 403 }
      );
    }

    if (session.status !== 'WAITING') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Cannot start an interview in ${session.status} status.`,
          },
        },
        { status: 409 }
      );
    }

    if (!session.candidateId) {
      return NextResponse.json(
        {
          error: {
            code: 'PRECONDITION_FAILED',
            message: 'A candidate must join through an invitation before the interview can start.',
          },
        },
        { status: 412 }
      );
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + session.durationSeconds * 1000);

    const updated = await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        status: 'ACTIVE',
        startedAt,
        endsAt,
      },
    });

    return NextResponse.json({
      interview: {
        id: updated.id,
        roomCode: updated.roomCode,
        status: updated.status,
        startedAt: updated.startedAt,
        endsAt: updated.endsAt,
      },
    });
  } catch (error) {
    console.error('[API POST /api/interviews/[id]/start] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to start interview session.' } },
      { status: 500 }
    );
  }
}

