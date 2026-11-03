import crypto from 'node:crypto';
import type { SessionStatus } from './types.js';

/**
 * Generates a cryptographically secure random token (64 hex characters)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes SHA-256 hash of a token for secure database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates an 8-character human-friendly alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Normalizes output string for fair comparison:
 * - Converts CRLF to LF
 * - Trims trailing whitespace from each line
 * - Trims trailing newlines
 */
export function normalizeOutput(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd();
}

/**
 * Validates interview session status transitions
 */
export function isValidStateTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (from === 'WAITING' && to === 'ACTIVE') return true;
  if (from === 'WAITING' && to === 'COMPLETED') return true;
  if (from === 'ACTIVE' && to === 'COMPLETED') return true;
  return false;
}

