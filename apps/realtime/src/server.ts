import { Hocuspocus } from '@hocuspocus/server';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export interface RealtimeServerOptions {
  port?: number;
  prisma?: PrismaClient;
  jwtSecret?: string;
  debounceMs?: number;
  maxDebounceMs?: number;
}

export function createRealtimeServer(options: RealtimeServerOptions = {}) {
  const prisma = options.prisma || new PrismaClient();
  const jwtSecret =
    options.jwtSecret ||
    process.env.REALTIME_JWT_SECRET ||
    'paircode_development_super_secret_jwt_token_must_be_long_and_safe';
  const port = options.port || parseInt(process.env.PORT || '8080', 10);
  const debounceMs = options.debounceMs || 1000;
  const maxDebounceMs = options.maxDebounceMs || 5000;

  const server = new Hocuspocus({
    port,
    debounce: debounceMs,
    maxDebounce: maxDebounceMs,

    async onAuthenticate(data) {
      const { token, documentName } = data;
      if (!token) {
        throw new Error('Authentication token required');
      }

      let payload: any;
      try {
        payload = jwt.verify(token, jwtSecret);
      } catch (err) {
        throw new Error('Invalid or expired authentication token');
      }

      const expectedDocName = `paircode:session:${payload.sessionId}`;
      if (documentName !== expectedDocName) {
        throw new Error('Token session ID does not match requested room document');
      }

      // Verify session exists and is not completed
      const session = await prisma.interviewSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session) {
        throw new Error('Interview session does not exist');
      }

      if (session.status === 'COMPLETED') {
        throw new Error('Cannot join completed interview session');
      }

      // Verify user is the interviewer or candidate
      if (session.interviewerId !== payload.sub && session.candidateId !== payload.sub) {
        throw new Error('User is not authorized for this interview session');
      }

      return {
        user: {
          id: payload.sub,
          name: payload.name || 'Anonymous User',
          role: payload.role,
        },
      };
    },

    async onLoadDocument(data) {
      const { documentName, document } = data;
      // Extract sessionId from paircode:session:<id>
      const sessionId = documentName.replace(/^paircode:session:/, '');

      // Check if existing snapshot exists in database
      const existingDoc = await prisma.yjsDocument.findUnique({
        where: { sessionId },
      });

      if (existingDoc && existingDoc.state) {
        Y.applyUpdate(document, new Uint8Array(existingDoc.state));
        return document;
      }

      // If new room, seed starter code from question
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        include: { question: true },
      });

      if (session && session.question) {
        const starterCode = (session.question.starterCode as Record<string, string>)?.python || '';
        const sharedText = document.getText('code');
        if (sharedText.length === 0 && starterCode) {
          sharedText.insert(0, starterCode);
        }
      }

      return document;
    },

    async onStoreDocument(data) {
      const { documentName, document } = data;
      const sessionId = documentName.replace(/^paircode:session:/, '');

      // Verify session is not already completed
      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.status === 'COMPLETED') {
        return;
      }

      const state = Buffer.from(Y.encodeStateAsUpdate(document));

      await prisma.yjsDocument.upsert({
        where: { sessionId },
        update: { state },
        create: {
          sessionId,
          state,
        },
      });
    },
  });

  return { server, prisma, port };
}

