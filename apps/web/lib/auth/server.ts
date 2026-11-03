import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '../db.js';
import type { User, InterviewSession } from '@prisma/client';

export interface AuthContext {
  user: User;
}

// In-memory mock user store for isolated automated testing when Clerk is not configured
let mockTestUser: User | null = null;

export function setMockTestUser(user: User | null): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test auth mock cannot be set outside test environment.');
  }
  mockTestUser = user;
}

/**
 * Resolves the authenticated user server-side.
 * Synchronizes user data with PostgreSQL User table if needed.
 */
export async function getCurrentUser(): Promise<User | null> {
  // Test environment mock support
  if (process.env.NODE_ENV === 'test' && mockTestUser) {
    return mockTestUser;
  }

  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { clerkUserId },
    });

    if (!user) {
      // Sync from Clerk
      const clerkUser = await currentUser();
      if (!clerkUser) return null;

      const email = clerkUser.emailAddresses[0]?.emailAddress || `${clerkUserId}@paircode.internal`;
      const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'PairCode User';
      const imageUrl = clerkUser.imageUrl || null;

      user = await prisma.user.upsert({
        where: { clerkUserId },
        update: {
          email,
          name,
          imageUrl,
        },
        create: {
          clerkUserId,
          email,
          name,
          imageUrl,
        },
      });
    }

    return user;
  } catch (error) {
    console.error('[Auth] Failed to resolve current user:', error);
    return null;
  }
}

/**
 * Requires an authenticated user or throws an unauthorized error
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export type ParticipantRole = 'INTERVIEWER' | 'CANDIDATE';

/**
 * Verifies that a user is an authorized participant (interviewer or candidate) of an interview
 */
export function verifySessionParticipant(
  session: Pick<InterviewSession, 'interviewerId' | 'candidateId'>,
  userId: string
): { isParticipant: boolean; role: ParticipantRole | null } {
  if (session.interviewerId === userId) {
    return { isParticipant: true, role: 'INTERVIEWER' };
  }
  if (session.candidateId === userId) {
    return { isParticipant: true, role: 'CANDIDATE' };
  }
  return { isParticipant: false, role: null };
}

/**
 * Verifies that a user is the interviewer (host) of an interview
 */
export function verifyIsInterviewer(
  session: Pick<InterviewSession, 'interviewerId'>,
  userId: string
): boolean {
  return session.interviewerId === userId;
}

/**
 * Verifies whether the interview is currently active
 */
export function verifyIsActive(session: Pick<InterviewSession, 'status'>): boolean {
  return session.status === 'ACTIVE';
}

