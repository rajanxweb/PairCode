import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifySessionParticipant } from '@/lib/auth/server';
import jwt from 'jsonwebtoken';

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

    const { isParticipant, role } = verifySessionParticipant(session, user.id);
    if (!isParticipant || !role) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'You are not authorized to access the collaboration room for this session.',
          },
        },
        { status: 403 }
      );
    }

    const secret =
      process.env.REALTIME_JWT_SECRET ||
      'paircode_development_super_secret_jwt_token_must_be_long_and_safe';

    const expiresInSeconds = 15 * 60; // 15 minutes
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const token = jwt.sign(
      {
        sub: user.id,
        sessionId: session.id,
        roomCode: session.roomCode,
        role,
        name: user.name,
        exp,
      },
      secret,
      { algorithm: 'HS256' }
    );

    const realtimeWsUrl = process.env.REALTIME_URL || 'ws://localhost:8080/collaboration';

    return NextResponse.json({
      token,
      expiresAt: new Date(exp * 1000),
      url: realtimeWsUrl,
      roomName: `paircode:session:${session.id}`,
    });
  } catch (error) {
    console.error('[API POST /api/interviews/[id]/realtime-token] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to issue realtime collaboration token.' } },
      { status: 500 }
    );
  }
}

