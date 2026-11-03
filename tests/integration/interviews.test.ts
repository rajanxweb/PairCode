import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setMockTestUser } from '../../apps/web/lib/auth/server.js';
import { prisma } from '../../apps/web/lib/db.js';
import { GET as getQuestions } from '../../apps/web/app/api/questions/route.js';
import { GET as getQuestionById } from '../../apps/web/app/api/questions/[id]/route.js';
import { POST as createInterview, GET as getInterviews } from '../../apps/web/app/api/interviews/route.js';
import { GET as getInterviewById } from '../../apps/web/app/api/interviews/[id]/route.js';
import { POST as startInterview } from '../../apps/web/app/api/interviews/[id]/start/route.js';
import { POST as endInterview } from '../../apps/web/app/api/interviews/[id]/end/route.js';
import { POST as acceptInvitation } from '../../apps/web/app/api/invitations/[token]/accept/route.js';
import { POST as getRealtimeToken } from '../../apps/web/app/api/interviews/[id]/realtime-token/route.js';
import jwt from 'jsonwebtoken';
import { hashToken } from '@paircode/shared';

describe('Interview & Question APIs Integration Tests', () => {
  const interviewerUser = {
    id: 'user_host_1',
    clerkUserId: 'clerk_host_1',
    email: 'host@paircode.test',
    name: 'Host Interviewer',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const candidateUser = {
    id: 'user_candidate_2',
    clerkUserId: 'clerk_cand_2',
    email: 'cand@paircode.test',
    name: 'Candidate User',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const intruderUser = {
    id: 'user_intruder_3',
    clerkUserId: 'clerk_intruder_3',
    email: 'intruder@paircode.test',
    name: 'Intruder User',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleQuestion = {
    id: 'q_two_sum',
    slug: 'two-sum',
    title: 'Two Sum',
    statement: 'Given an array of integers...',
    difficulty: 'EASY' as const,
    topics: ['Arrays', 'Hash maps'],
    constraints: ['2 <= nums.length <= 10^4'],
    examples: [{ input: '4\n2 7 11 15\n9', output: '0 1' }],
    starterCode: { python: 'def two_sum(): pass' },
    createdAt: new Date(),
    updatedAt: new Date(),
    testCases: [
      { id: 'tc_1', input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, order: 1 },
      { id: 'tc_hidden', input: 'secret input', expectedOutput: 'secret output', isHidden: true, order: 2 },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/questions returns questions list', async () => {
    setMockTestUser(interviewerUser);
    vi.spyOn(prisma.question, 'findMany').mockResolvedValueOnce([
      {
        id: sampleQuestion.id,
        slug: sampleQuestion.slug,
        title: sampleQuestion.title,
        difficulty: sampleQuestion.difficulty,
        topics: sampleQuestion.topics,
        createdAt: sampleQuestion.createdAt,
      },
    ] as any);
    vi.spyOn(prisma.question, 'count').mockResolvedValueOnce(1);

    const req = new NextRequest('http://localhost:3000/api/questions?page=1&limit=10');
    const res = await getQuestions(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].title).toBe('Two Sum');
    expect(data.pagination.total).toBe(1);
  });

  it('GET /api/questions/[id] strictly hides hidden test cases', async () => {
    setMockTestUser(interviewerUser);
    vi.spyOn(prisma.question, 'findFirst').mockResolvedValueOnce({
      ...sampleQuestion,
      testCases: sampleQuestion.testCases.filter((tc) => !tc.isHidden),
    } as any);

    const req = new NextRequest('http://localhost:3000/api/questions/two-sum');
    const res = await getQuestionById(req, { params: Promise.resolve({ id: 'two-sum' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.question.sampleCases).toHaveLength(1);
    expect(data.question.sampleCases[0].id).toBe('tc_1');
    // Ensure hidden test cases are never present in payload
    expect(data.question.sampleCases.some((tc: any) => tc.id === 'tc_hidden')).toBe(false);
  });

  it('POST /api/interviews creates interview and generates secure invitation token', async () => {
    setMockTestUser(interviewerUser);
    vi.spyOn(prisma.question, 'findUnique').mockResolvedValueOnce(sampleQuestion as any);

    let createdSessionData: any = null;
    vi.spyOn(prisma.interviewSession, 'create').mockImplementationOnce(async (args: any) => {
      createdSessionData = args.data;
      return {
        id: 'sess_123',
        ...args.data,
        createdAt: new Date(),
        question: { id: sampleQuestion.id, title: sampleQuestion.title, difficulty: sampleQuestion.difficulty },
      };
    });

    const req = new NextRequest('http://localhost:3000/api/interviews', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Senior Frontend Screen',
        questionId: sampleQuestion.id,
        durationSeconds: 3600,
      }),
    });

    const res = await createInterview(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.interview.id).toBe('sess_123');
    expect(data.interview.inviteUrl).toContain('/join/');
    // Verify token hash was stored, not raw token
    expect(createdSessionData.inviteTokenHash).toHaveLength(64);
  });

  it('POST /api/invitations/[token]/accept binds candidate and rejects third party', async () => {
    const rawToken = 'sample_raw_invitation_token_123456789';
    const tokenHash = hashToken(rawToken);

    const mockSession = {
      id: 'sess_123',
      roomCode: 'ABC12345',
      title: 'Senior Frontend Screen',
      interviewerId: interviewerUser.id,
      candidateId: null,
      status: 'WAITING',
      inviteTokenHash: tokenHash,
      inviteExpiresAt: new Date(Date.now() + 100000),
      interviewer: { id: interviewerUser.id, name: interviewerUser.name },
    };

    vi.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue(mockSession as any);
    vi.spyOn(prisma.interviewSession, 'update').mockImplementationOnce(async (args: any) => ({
      ...mockSession,
      ...args.data,
    }));

    // Candidate accepts
    setMockTestUser(candidateUser);
    const req1 = new NextRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, { method: 'POST' });
    const res1 = await acceptInvitation(req1, { params: Promise.resolve({ token: rawToken }) });
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.session.role).toBe('CANDIDATE');

    // Intruder attempts to join same interview
    setMockTestUser(intruderUser);
    mockSession.candidateId = candidateUser.id as any;
    const req2 = new NextRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, { method: 'POST' });
    const res2 = await acceptInvitation(req2, { params: Promise.resolve({ token: rawToken }) });
    expect(res2.status).toBe(409);
    const data2 = await res2.json();
    expect(data2.error.code).toBe('CONFLICT');
  });

  it('enforces start and end interview lifecycle permissions', async () => {
    const activeSession = {
      id: 'sess_123',
      roomCode: 'ABC12345',
      status: 'WAITING' as const,
      interviewerId: interviewerUser.id,
      candidateId: candidateUser.id,
      durationSeconds: 3600,
      yjsDocument: null,
      finalCode: null,
    };

    vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValue(activeSession as any);
    vi.spyOn(prisma.interviewSession, 'update').mockImplementation(async (args: any) => ({
      ...activeSession,
      ...args.data,
    }));

    // Candidate cannot start interview
    setMockTestUser(candidateUser);
    const reqCandidate = new NextRequest('http://localhost:3000/api/interviews/sess_123/start', { method: 'POST' });
    const resCandidate = await startInterview(reqCandidate, { params: Promise.resolve({ id: 'sess_123' }) });
    expect(resCandidate.status).toBe(403);

    // Interviewer starts interview
    setMockTestUser(interviewerUser);
    const reqHost = new NextRequest('http://localhost:3000/api/interviews/sess_123/start', { method: 'POST' });
    const resHost = await startInterview(reqHost, { params: Promise.resolve({ id: 'sess_123' }) });
    expect(resHost.status).toBe(200);
    const dataHost = await resHost.json();
    expect(dataHost.interview.status).toBe('ACTIVE');
    expect(dataHost.interview.startedAt).toBeDefined();

    // Interviewer ends interview
    activeSession.status = 'ACTIVE';
    const reqEnd = new NextRequest('http://localhost:3000/api/interviews/sess_123/end', { method: 'POST' });
    const resEnd = await endInterview(reqEnd, { params: Promise.resolve({ id: 'sess_123' }) });
    expect(resEnd.status).toBe(200);
    const dataEnd = await resEnd.json();
    expect(dataEnd.interview.status).toBe('COMPLETED');
  });

  it('POST /api/interviews/[id]/realtime-token issues signed JWT for authorized participants', async () => {
    const activeSession = {
      id: 'sess_123',
      roomCode: 'ABC12345',
      interviewerId: interviewerUser.id,
      candidateId: candidateUser.id,
      status: 'ACTIVE' as const,
    };

    vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValue(activeSession as any);

    // Interviewer obtains token
    setMockTestUser(interviewerUser);
    const req = new NextRequest('http://localhost:3000/api/interviews/sess_123/realtime-token', { method: 'POST' });
    const res = await getRealtimeToken(req, { params: Promise.resolve({ id: 'sess_123' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.token).toBeDefined();

    // Verify token claims and signature
    const secret = process.env.REALTIME_JWT_SECRET || 'paircode_development_super_secret_jwt_token_must_be_long_and_safe';
    const decoded: any = jwt.verify(data.token, secret);
    expect(decoded.sub).toBe(interviewerUser.id);
    expect(decoded.sessionId).toBe('sess_123');
    expect(decoded.role).toBe('INTERVIEWER');

    // Unauthorized stranger is rejected
    setMockTestUser(intruderUser);
    const reqIntruder = new NextRequest('http://localhost:3000/api/interviews/sess_123/realtime-token', { method: 'POST' });
    const resIntruder = await getRealtimeToken(reqIntruder, { params: Promise.resolve({ id: 'sess_123' }) });
    expect(resIntruder.status).toBe(403);
  });
});

