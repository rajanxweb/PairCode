import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';
import {
  createInterviewSchema,
  generateRoomCode,
  generateSecureToken,
  hashToken,
} from '@paircode/shared';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = createInterviewSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid interview creation payload.',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { title, questionId, durationSeconds } = parseResult.data;

    // Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Selected question does not exist.' } },
        { status: 404 }
      );
    }

    const rawInviteToken = generateSecureToken();
    const inviteTokenHash = hashToken(rawInviteToken);
    const roomCode = generateRoomCode();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.interviewSession.create({
      data: {
        title,
        roomCode,
        interviewerId: user.id,
        questionId: question.id,
        durationSeconds,
        inviteTokenHash,
        inviteExpiresAt,
      },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/join/${rawInviteToken}`;

    return NextResponse.json(
      {
        interview: {
          id: session.id,
          roomCode: session.roomCode,
          title: session.title,
          status: session.status,
          durationSeconds: session.durationSeconds,
          inviteUrl,
          question: session.question,
          createdAt: session.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API POST /api/interviews] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create interview session.' } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const interviews = await prisma.interviewSession.findMany({
      where: {
        OR: [{ interviewerId: user.id }, { candidateId: user.id }],
      },
      include: {
        interviewer: {
          select: { id: true, name: true, email: true },
        },
        candidate: {
          select: { id: true, name: true, email: true },
        },
        question: {
          select: { id: true, title: true, difficulty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      interviews: interviews.map((session) => ({
        id: session.id,
        roomCode: session.roomCode,
        title: session.title,
        status: session.status,
        durationSeconds: session.durationSeconds,
        startedAt: session.startedAt,
        endsAt: session.endsAt,
        endedAt: session.endedAt,
        role: session.interviewerId === user.id ? 'INTERVIEWER' : 'CANDIDATE',
        interviewer: session.interviewer,
        candidate: session.candidate,
        question: session.question,
        createdAt: session.createdAt,
      })),
    });
  } catch (error) {
    console.error('[API GET /api/interviews] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve interviews.' } },
      { status: 500 }
    );
  }
}

