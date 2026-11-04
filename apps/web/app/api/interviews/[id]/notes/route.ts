import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, verifyIsInterviewer } from '@/lib/auth/server';
import { interviewNoteSchema } from '@paircode/shared';

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

    // Strict security rule: only the interviewer can view private notes
    if (!verifyIsInterviewer(session, user.id)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Candidates are not permitted to access private interviewer notes.',
          },
        },
        { status: 403 }
      );
    }

    const note = await prisma.interviewNote.findUnique({
      where: {
        sessionId_interviewerId: {
          sessionId: session.id,
          interviewerId: user.id,
        },
      },
    });

    return NextResponse.json({
      note: note
        ? {
            id: note.id,
            content: note.content,
            updatedAt: note.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('[API GET /api/interviews/[id]/notes] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve notes.' } },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Strict security rule: only interviewer can create or update notes
    if (!verifyIsInterviewer(session, user.id)) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Only the interviewer can create or modify interview notes.',
          },
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = interviewNoteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notes format.',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const note = await prisma.interviewNote.upsert({
      where: {
        sessionId_interviewerId: {
          sessionId: session.id,
          interviewerId: user.id,
        },
      },
      update: {
        content: parseResult.data.content,
      },
      create: {
        sessionId: session.id,
        interviewerId: user.id,
        content: parseResult.data.content,
      },
    });

    return NextResponse.json({
      note: {
        id: note.id,
        content: note.content,
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    console.error('[API PUT /api/interviews/[id]/notes] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save interview notes.' } },
      { status: 500 }
    );
  }
}

