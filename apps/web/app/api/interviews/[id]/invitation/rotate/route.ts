import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyIsInterviewer } from '@/lib/auth/server';
import { generateSecureToken, hashToken } from '@paircode/shared';

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
        { error: { code: 'FORBIDDEN', message: 'Only the interviewer can rotate invitation tokens.' } },
        { status: 403 }
      );
    }

    const rawToken = generateSecureToken();
    const inviteTokenHash = hashToken(rawToken);
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        inviteTokenHash,
        inviteExpiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/join/${rawToken}`;

    return NextResponse.json({
      inviteUrl,
      expiresAt: inviteExpiresAt,
    });
  } catch (error) {
    console.error('[API POST /api/interviews/[id]/invitation/rotate] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to rotate invitation token.' } },
      { status: 500 }
    );
  }
}

