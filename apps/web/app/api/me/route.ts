import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be signed in to access this profile.',
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[API /api/me] Error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while fetching user profile.',
        },
      },
      { status: 500 }
    );
  }
}

