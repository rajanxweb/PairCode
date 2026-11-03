import { describe, it, expect } from 'vitest';
import {
  generateSecureToken,
  hashToken,
  generateRoomCode,
  normalizeOutput,
  isValidStateTransition,
} from '../utils.js';

describe('Shared Utilities', () => {
  it('generates secure 64-character hex tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('hashes tokens deterministically with SHA-256', () => {
    const token = 'sample_secure_token_123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('generates 8-character human-friendly room codes', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(8);
    expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
  });

  it('normalizes output correctly (CRLF -> LF and line-end trimming)', () => {
    const raw = 'hello world   \r\nline two  \r\n\r\n';
    const normalized = normalizeOutput(raw);
    expect(normalized).toBe('hello world\nline two');
  });

  it('enforces valid interview state transitions', () => {
    expect(isValidStateTransition('WAITING', 'ACTIVE')).toBe(true);
    expect(isValidStateTransition('WAITING', 'COMPLETED')).toBe(true);
    expect(isValidStateTransition('ACTIVE', 'COMPLETED')).toBe(true);
    expect(isValidStateTransition('COMPLETED', 'ACTIVE')).toBe(false);
    expect(isValidStateTransition('COMPLETED', 'WAITING')).toBe(false);
  });
});

