import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { setMockTestUser } from '../../apps/web/lib/auth/server.js';
import { prisma } from '../../apps/web/lib/db.js';
import { GET as getNotes, PUT as putNotes } from '../../apps/web/app/api/interviews/[id]/notes/route.js';
import { POST as endInterview } from '../../apps/web/app/api/interviews/[id]/end/route.js';

describe('Interview Workflow & Notes Privacy Integration', () => {
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

  const sampleSession = {
    id: 'sess_active_1',
    roomCode: 'SESS1234',
    title: 'Senior Engineer Loop',
    status: 'ACTIVE' as const,
    interviewerId: interviewerUser.id,
    candidateId: candidateUser.id,
    durationSeconds: 3600,
    yjsDocument: null,
    finalCode: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows interviewer to save and retrieve private notes', async () => {
    setMockTestUser(interviewerUser);

    vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValue(sampleSession as any);

    const savedNote = {
      id: 'note_1',
      sessionId: sampleSession.id,
      interviewerId: interviewerUser.id,
      content: {
        approach: 'Structured and methodical.',
        technical: 'Clean algorithms.',
        communication: 'Clear narration.',
        strengths: 'Fast debugging.',
        areasForImprovement: 'Could discuss scalability.',
        overall: 'Strong Hire',
      },
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    vi.spyOn(prisma.interviewNote, 'upsert').mockResolvedValue(savedNote as any);
    vi.spyOn(prisma.interviewNote, 'findUnique').mockResolvedValue(savedNote as any);

    // Save notes
    const putReq = new NextRequest('http://localhost:3000/api/interviews/sess_active_1/notes', {
      method: 'PUT',
      body: JSON.stringify({ content: savedNote.content }),
    });
    const putRes = await putNotes(putReq, { params: Promise.resolve({ id: 'sess_active_1' }) });
    expect(putRes.status).toBe(200);

    // Retrieve notes
    const getReq = new NextRequest('http://localhost:3000/api/interviews/sess_active_1/notes');
    const getRes = await getNotes(getReq, { params: Promise.resolve({ id: 'sess_active_1' }) });
    expect(getRes.status).toBe(200);

    const data = await getRes.json();
    expect(data.note.content.overall).toBe('Strong Hire');
  });

  it('strictly forbids candidate from accessing private interviewer notes', async () => {
    setMockTestUser(candidateUser);

    vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValue(sampleSession as any);

    const getReq = new NextRequest('http://localhost:3000/api/interviews/sess_active_1/notes');
    const getRes = await getNotes(getReq, { params: Promise.resolve({ id: 'sess_active_1' }) });
    expect(getRes.status).toBe(403);

    const data = await getRes.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('strictly forbids candidate from modifying private notes', async () => {
    setMockTestUser(candidateUser);

    vi.spyOn(prisma.interviewSession, 'findFirst').mockResolvedValue(sampleSession as any);

    const putReq = new NextRequest('http://localhost:3000/api/interviews/sess_active_1/notes', {
      method: 'PUT',
      body: JSON.stringify({
        content: { approach: 'Unauthorized edit', technical: '', communication: '', strengths: '', areasForImprovement: '', overall: '' },
      }),
    });
    const putRes = await putNotes(putReq, { params: Promise.resolve({ id: 'sess_active_1' }) });
    expect(putRes.status).toBe(403);
  });
});

