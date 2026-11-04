import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { createRealtimeServer } from '../../apps/realtime/src/server.js';
import jwt from 'jsonwebtoken';

describe('Realtime Collaboration & Document Persistence', () => {
  const TEST_PORT = 8765;
  const JWT_SECRET = 'test_super_secret_realtime_jwt_secret_32chars';
  let serverInstance: any;
  let mockPrisma: any;

  // Stored snapshots in mock database
  const docStore = new Map<string, Uint8Array>();

  const testSession = {
    id: 'test_sess_1',
    roomCode: 'TEST1234',
    title: 'Realtime Sync Test',
    status: 'ACTIVE',
    interviewerId: 'user_alice',
    candidateId: 'user_bob',
    question: {
      starterCode: { python: '# starter template\n' },
    },
  };

  beforeAll(async () => {
    mockPrisma = {
      interviewSession: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === testSession.id) return testSession;
          return null;
        }),
      },
      yjsDocument: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          const state = docStore.get(where.sessionId);
          return state ? { sessionId: where.sessionId, state } : null;
        }),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => {
          const state = update?.state || create?.state;
          docStore.set(where.sessionId, state);
          return { sessionId: where.sessionId, state };
        }),
      },
    };

    const { server } = createRealtimeServer({
      port: TEST_PORT,
      prisma: mockPrisma,
      jwtSecret: JWT_SECRET,
      debounceMs: 50,
      maxDebounceMs: 100,
    });

    serverInstance = server;
    await serverInstance.listen();
  });

  afterAll(async () => {
    if (serverInstance) {
      await serverInstance.destroy();
    }
  });

  function createTestToken(userId: string, role: 'INTERVIEWER' | 'CANDIDATE', sessionId = testSession.id) {
    return jwt.sign(
      {
        sub: userId,
        sessionId,
        roomCode: testSession.roomCode,
        role,
        name: userId === 'user_alice' ? 'Alice Host' : 'Bob Candidate',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET
    );
  }

  it('synchronizes text between Interviewer and Candidate across WebSocket', async () => {
    const ydocA = new Y.Doc();
    const ydocB = new Y.Doc();

    const tokenA = createTestToken('user_alice', 'INTERVIEWER');
    const tokenB = createTestToken('user_bob', 'CANDIDATE');

    const providerA = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${testSession.id}`,
      document: ydocA,
      token: tokenA,
    });

    const providerB = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${testSession.id}`,
      document: ydocB,
      token: tokenB,
    });

    // Wait for initial connection and synchronization
    await new Promise((res) => setTimeout(res, 600));

    // Client A types code
    const textA = ydocA.getText('code');
    textA.insert(0, 'def two_sum(nums, target):\n    return []');

    // Wait for sync propagation
    await new Promise((res) => setTimeout(res, 400));

    // Client B must receive identical text
    const textB = ydocB.getText('code');
    expect(textB.toString()).toBe(textA.toString());
    expect(textB.toString()).toContain('def two_sum');

    // Client B makes a concurrent edit
    textB.insert(textB.length, '\n# candidate comment');

    await new Promise((res) => setTimeout(res, 400));

    // Both documents converge cleanly
    expect(textA.toString()).toBe(textB.toString());
    expect(textA.toString()).toContain('# candidate comment');

    providerA.destroy();
    providerB.destroy();
    ydocA.destroy();
    ydocB.destroy();
  });

  it('broadcasts Yjs awareness states between participants', async () => {
    const ydocA = new Y.Doc();
    const ydocB = new Y.Doc();

    const providerA = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${testSession.id}`,
      document: ydocA,
      token: createTestToken('user_alice', 'INTERVIEWER'),
    });

    const providerB = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${testSession.id}`,
      document: ydocB,
      token: createTestToken('user_bob', 'CANDIDATE'),
    });

    await new Promise((res) => setTimeout(res, 600));

    // Client A sets awareness
    providerA.awareness?.setLocalStateField('user', {
      name: 'Alice Host',
      color: '#326B57',
    });

    await new Promise((res) => setTimeout(res, 400));

    // Client B perceives Client A in awareness states
    const states = Array.from(providerB.awareness?.getStates().values() || []) as any[];
    const aliceState = states.find((s) => s.user?.name === 'Alice Host');

    expect(aliceState).toBeDefined();
    expect(aliceState.user.color).toBe('#326B57');

    providerA.destroy();
    providerB.destroy();
    ydocA.destroy();
    ydocB.destroy();
  });

  it('rejects unauthorized connection with invalid signature', async () => {
    const ydoc = new Y.Doc();
    const fakeToken = jwt.sign(
      { sub: 'unauthorized', sessionId: testSession.id, role: 'CANDIDATE' },
      'wrong_unshared_secret_key'
    );

    let authFailed = false;

    const provider = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${testSession.id}`,
      document: ydoc,
      token: fakeToken,
      onAuthenticationFailed() {
        authFailed = true;
      },
    });

    await new Promise((res) => setTimeout(res, 600));

    expect(authFailed).toBe(true);

    provider.destroy();
    ydoc.destroy();
  });

  it('keeps different interview room documents completely isolated', async () => {
    const ydocRoom1 = new Y.Doc();
    const ydocRoom2 = new Y.Doc();

    const session2 = {
      id: 'sess_2_isolated',
      roomCode: 'ROOM2222',
      status: 'ACTIVE',
      interviewerId: 'user_alice',
      candidateId: 'user_bob',
      question: { starterCode: {} },
    };

    mockPrisma.interviewSession.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === testSession.id) return testSession;
      if (where.id === session2.id) return session2;
      return null;
    });

    const provider1 = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${testSession.id}`,
      document: ydocRoom1,
      token: createTestToken('user_alice', 'INTERVIEWER', testSession.id),
    });

    const provider2 = new HocuspocusProvider({
      url: `ws://127.0.0.1:${TEST_PORT}`,
      name: `paircode:session:${session2.id}`,
      document: ydocRoom2,
      token: createTestToken('user_alice', 'INTERVIEWER', session2.id),
    });

    await new Promise((res) => setTimeout(res, 600));

    ydocRoom1.getText('code').insert(0, 'room 1 secret code');

    await new Promise((res) => setTimeout(res, 400));

    // Room 2 must not receive Room 1 content
    expect(ydocRoom2.getText('code').toString()).not.toContain('room 1 secret code');

    provider1.destroy();
    provider2.destroy();
    ydocRoom1.destroy();
    ydocRoom2.destroy();
  });
});

