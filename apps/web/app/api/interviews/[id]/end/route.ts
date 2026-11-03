import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyIsInterviewer } from '@/lib/auth/server';
import * as Y from 'yjs';

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
      include: {
        yjsDocument: true,
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
        { error: { code: 'FORBIDDEN', message: 'Only the interviewer can end this session.' } },
        { status: 403 }
      );
    }

    if (session.status === 'COMPLETED') {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'This interview has already been completed.',
          },
        },
        { status: 409 }
      );
    }

    // Extract final code from YjsDocument binary snapshot if available
    let extractedFinalCode = session.finalCode;
    if (session.yjsDocument?.state) {
      try {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, new Uint8Array(session.yjsDocument.state));
        const sharedText = ydoc.getText('code').toString();
        if (sharedText) {
          extractedFinalCode = sharedText;
        }
      } catch (err) {
        console.warn('[API End Interview] Warning: Could not decode Yjs document state:', err);
      }
    }

    const endedAt = new Date();

    const updated = await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        endedAt,
        finalCode: extractedFinalCode,
      },
    });

    return NextResponse.json({
      interview: {
        id: updated.id,
        roomCode: updated.roomCode,
        status: updated.status,
        endedAt: updated.endedAt,
        finalCode: updated.finalCode,
      },
    });
  } catch (error) {
    console.error('[API POST /api/interviews/[id]/end] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to end interview session.' } },
      { status: 500 }
    );
  }
}

