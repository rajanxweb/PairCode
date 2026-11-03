import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { questionQuerySchema } from '@paircode/shared';
import { getCurrentUser } from '@/lib/auth/server';
import { Difficulty } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parseResult = questionQuerySchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters.',
            details: parseResult.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const { search, difficulty, topic, page, limit } = parseResult.data;
    const skip = (page - 1) * limit;

    const whereClause: {
      title?: { contains: string; mode: 'insensitive' };
      difficulty?: Difficulty;
      topics?: { has: string };
    } = {};

    if (search) {
      whereClause.title = { contains: search, mode: 'insensitive' };
    }
    if (difficulty) {
      whereClause.difficulty = difficulty as Difficulty;
    }
    if (topic) {
      whereClause.topics = { has: topic };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where: whereClause,
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          topics: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.question.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API /api/questions] Error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve questions.' } },
      { status: 500 }
    );
  }
}

