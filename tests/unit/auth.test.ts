import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifySessionParticipant,
  verifyIsInterviewer,
  verifyIsActive,
  setMockTestUser,
  requireUser,
  getCurrentUser,
} from '../../apps/web/lib/auth/server.js';
import type { User } from '@prisma/client';

describe('Auth & Authorization Helpers', () => {
  const dummyInterviewer: User = {
    id: 'user_interviewer_1',
    clerkUserId: 'clerk_int_1',
    email: 'interviewer@paircode.test',
    name: 'Alice Interviewer',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dummyCandidate: User = {
    id: 'user_candidate_2',
    clerkUserId: 'clerk_cand_2',
    email: 'candidate@paircode.test',
    name: 'Bob Candidate',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleSession = {
    interviewerId: dummyInterviewer.id,
    candidateId: dummyCandidate.id,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    setMockTestUser(null);
  });

  it('correctly identifies interviewer as participant and interviewer', () => {
    const res = verifySessionParticipant(sampleSession, dummyInterviewer.id);
    expect(res.isParticipant).toBe(true);
    expect(res.role).toBe('INTERVIEWER');

    expect(verifyIsInterviewer(sampleSession, dummyInterviewer.id)).toBe(true);
  });

  it('correctly identifies candidate as participant and not interviewer', () => {
    const res = verifySessionParticipant(sampleSession, dummyCandidate.id);
    expect(res.isParticipant).toBe(true);
    expect(res.role).toBe('CANDIDATE');

    expect(verifyIsInterviewer(sampleSession, dummyCandidate.id)).toBe(false);
  });

  it('rejects an unassigned user from interview participation', () => {
    const res = verifySessionParticipant(sampleSession, 'unauthorized_stranger');
    expect(res.isParticipant).toBe(false);
    expect(res.role).toBeNull();
    expect(verifyIsInterviewer(sampleSession, 'unauthorized_stranger')).toBe(false);
  });

  it('evaluates interview status active state', () => {
    expect(verifyIsActive({ status: 'ACTIVE' })).toBe(true);
    expect(verifyIsActive({ status: 'WAITING' })).toBe(false);
    expect(verifyIsActive({ status: 'COMPLETED' })).toBe(false);
  });

  it('supports isolated mock test user in test environment', async () => {
    setMockTestUser(dummyInterviewer);
    const user = await getCurrentUser();
    expect(user).toEqual(dummyInterviewer);

    const required = await requireUser();
    expect(required.id).toBe(dummyInterviewer.id);
  });

  it('throws UNAUTHORIZED when no user is present', async () => {
    setMockTestUser(null);
    await expect(requireUser()).rejects.toThrow('UNAUTHORIZED');
  });
});

