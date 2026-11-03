'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Code2,
  Clock,
  Users,
  Play,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Wifi,
  WifiOff,
  LogOut,
  Maximize2,
} from 'lucide-react';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';

interface SessionData {
  id: string;
  roomCode: string;
  title: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  durationSeconds: number;
  startedAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  role: 'INTERVIEWER' | 'CANDIDATE';
  interviewer: { id: string; name: string; email: string };
  candidate: { id: string; name: string; email: string } | null;
  question: {
    id: string;
    slug: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    topics: string[];
    statement: string;
    constraints: string[];
    examples: Array<{ input: string; output: string; explanation?: string }>;
    sampleCases: Array<{ id: string; input: string; expectedOutput: string; order: number }>;
  };
}

export default function RoomPage() {
  const params = useParams();
  const roomCode = params?.roomCode as string;
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('--:--');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connected');

  // Load session metadata
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/interviews/${roomCode}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || 'Could not load interview room.');
        }
        const data = await res.json();
        setSession(data.interview);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to room.');
      } finally {
        setLoading(false);
      }
    }
    if (roomCode) fetchSession();
  }, [roomCode]);

  // Server-authoritative timer countdown
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !session.endsAt) {
      if (session?.status === 'WAITING') setTimeLeft(`${Math.round(session.durationSeconds / 60)}:00`);
      if (session?.status === 'COMPLETED') setTimeLeft('00:00');
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(session.endsAt!).getTime();
      const remainingMs = Math.max(0, end - now);

      if (remainingMs <= 0) {
        setTimeLeft('00:00');
        clearInterval(timer);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-editor-background text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted">Entering PairCode room...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-4">
        <div className="w-full max-w-md rounded border border-border bg-surface p-6 text-center space-y-4">
          <AlertCircle className="mx-auto h-8 w-8 text-danger" />
          <h1 className="text-base font-semibold text-foreground">Room Access Restricted</h1>
          <p className="text-xs text-muted">{error}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* Mobile Notice Banner */}
      <div className="md:hidden bg-warning/15 border-b border-warning/30 px-3 py-1.5 text-[11px] text-warning text-center">
        PairCode is optimized for desktop browsers. Connect from a laptop or desktop for the best interview experience.
      </div>

      {/* Workspace Header */}
      <header className="h-12 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 font-semibold text-xs tracking-tight text-foreground">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-white">
              <Code2 className="h-3.5 w-3.5" />
            </div>
            <span>PairCode</span>
          </Link>

          <span className="text-border">|</span>

          <span className="text-xs font-medium text-foreground max-w-[200px] truncate">
            {session.title}
          </span>

          <StatusBadge status={session.status} />
        </div>

        {/* Center: Timer & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded bg-surface-muted px-2.5 py-1 text-xs font-mono font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted" />
            <span>{timeLeft}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            <span className="capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Right: Participants & Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              <span>{session.interviewer.name} (Host)</span>
            </div>
            {session.candidate ? (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning"></span>
                <span>{session.candidate.name} (Candidate)</span>
              </div>
            ) : (
              <span className="italic text-muted/70">Waiting for candidate...</span>
            )}
          </div>

          <Link
            href="/dashboard"
            className="rounded border border-border p-1.5 text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
            title="Leave Room"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Problem Statement */}
        <div className="w-full md:w-[42%] border-r border-border bg-surface flex flex-col overflow-y-auto">
          <div className="p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">{session.question.title}</h2>
                <DifficultyBadge difficulty={session.question.difficulty} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {session.question.topics.map((t) => (
                  <span key={t} className="rounded bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
              {session.question.statement}
            </div>

            {session.question.examples && session.question.examples.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Examples</h3>
                {session.question.examples.map((ex, i) => (
                  <div key={i} className="rounded border border-border bg-surface-muted/40 p-2.5 text-xs space-y-1">
                    <div className="text-muted text-[10px] uppercase font-medium">Example {i + 1}</div>
                    <div className="font-mono text-[11px]">
                      <span className="text-muted">Input: </span>{ex.input.replace(/\n/g, ' ')}
                    </div>
                    <div className="font-mono text-[11px]">
                      <span className="text-muted">Output: </span>{ex.output.replace(/\n/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {session.question.constraints && session.question.constraints.length > 0 && (
              <div className="space-y-1 pt-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Constraints</h3>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] font-mono text-muted">
                  {session.question.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Shared Editor & Terminal (Populated in Checkpoints 6 & 7) */}
        <div className="flex-1 flex flex-col bg-editor-background overflow-hidden" id="workspace-editor-terminal-container">
          {/* Top: Editor Canvas Placeholder */}
          <div className="flex-1 flex flex-col border-b border-border/20 bg-editor-background text-white p-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
              <span className="font-mono text-muted">solution.py</span>
              <span className="text-[11px] text-muted">Connecting Monaco Editor...</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-muted font-mono text-xs">
              {/* Monaco Editor mounted here */}
              Interactive Collaborative Monaco Editor Shell
            </div>
          </div>

          {/* Bottom: Terminal Canvas Placeholder */}
          <div className="h-48 border-t border-white/10 bg-[#121614] text-white p-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-muted">
              <span>Terminal & Test Results</span>
              <span>Ready</span>
            </div>
            <div className="pt-2 text-muted text-[11px]">
              Ready for execution. Click RUN to test custom input, or SUBMIT to evaluate against test cases.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

