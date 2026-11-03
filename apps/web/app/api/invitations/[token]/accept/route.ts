import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';
import { hashToken } from '@paircode/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to accept an invitation.' } },
        { status: 401 }
      );
    }

    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid invitation token format.' } },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const session = await prisma.interviewSession.findUnique({
      where: { inviteTokenHash: tokenHash },
      include: {
        interviewer: {
          select: { id: true, name: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invitation not found or invalid token.' } },
        { status: 404 }
      );
    }

    if (new Date() > session.inviteExpiresAt) {
      return NextResponse.json(
        { error: { code: 'GONE', message: 'This invitation has expired.' } },
        { status: 410 }
      );
    }

    if (session.status === 'COMPLETED') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'This interview has already been completed.' } },
        { status: 409 }
      );
    }

    // If caller is the interviewer, permit entry
    if (session.interviewerId === user.id) {
      return NextResponse.json({
        session: {
          id: session.id,
          roomCode: session.roomCode,
          title: session.title,
          role: 'INTERVIEWER',
        },
      });
    }

    // Candidate assignment
    if (!session.candidateId) {
      // Bind slot to this candidate
      const updated = await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          candidateId: user.id,
          inviteAcceptedAt: new Date(),
        },
      });

      return NextResponse.json({
        session: {
          id: updated.id,
          roomCode: updated.roomCode,
          title: updated.title,
          role: 'CANDIDATE',
        },
      });
    }

    // Reconnecting candidate
    if (session.candidateId === user.id) {
      return NextResponse.json({
        session: {
          id: session.id,
          roomCode: session.roomCode,
          title: session.title,
          role: 'CANDIDATE',
        },
      });
    }

    // Candidate slot occupied by someone else
    return NextResponse.json(
      {
        error: {
          code: 'CONFLICT',
          message: 'This interview already has an assigned candidate.',
        },
      },
      { status: 409 }
    );
  } catch (error) {
    console.error('[API POST /api/invitations/[token]/accept] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process invitation.' } },
      { status: 500 }
    );
  }
}

