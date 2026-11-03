import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server';

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

    const question = await prisma.question.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
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
    });

    if (!question) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Question not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      question: {
        id: question.id,
        slug: question.slug,
        title: question.title,
        statement: question.statement,
        difficulty: question.difficulty,
        topics: question.topics,
        constraints: question.constraints,
        examples: question.examples,
        starterCode: question.starterCode,
        sampleCases: question.testCases,
        createdAt: question.createdAt,
      },
    });
  } catch (error) {
    console.error('[API /api/questions/[id]] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve question details.' } },
      { status: 500 }
    );
  }
}

