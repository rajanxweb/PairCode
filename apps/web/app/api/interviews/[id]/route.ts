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
      include: {
        interviewer: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        candidate: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        question: {
          include: {
            testCases: {
              where: { isHidden: false },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                input: true,
                expectedOutput: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Interview session not found.' } },
        { status: 404 }
      );
    }

    const { isParticipant, role } = verifySessionParticipant(session, user.id);
    if (!isParticipant) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not an authorized participant of this interview session.',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      interview: {
        id: session.id,
        roomCode: session.roomCode,
        title: session.title,
        status: session.status,
        durationSeconds: session.durationSeconds,
        startedAt: session.startedAt,
        endsAt: session.endsAt,
        endedAt: session.endedAt,
        role,
        interviewer: session.interviewer,
        candidate: session.candidate,
        question: {
          id: session.question.id,
          slug: session.question.slug,
          title: session.question.title,
          statement: session.question.statement,
          difficulty: session.question.difficulty,
          topics: session.question.topics,
          constraints: session.question.constraints,
          examples: session.question.examples,
          starterCode: session.question.starterCode,
          sampleCases: session.question.testCases,
        },
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error('[API GET /api/interviews/[id]] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve interview details.' } },
      { status: 500 }
    );
  }
}

