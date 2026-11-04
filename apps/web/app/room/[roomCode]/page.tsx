'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Code2,
  Clock,
  Play,
  Send,
  Lock,
  LogOut,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Square,
  FileEdit,
  ArrowRight,
} from 'lucide-react';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';
import { CodeEditor } from '@/components/CodeEditor';
import { Terminal, ActiveExecutionData } from '@/components/Terminal';
import { NotesDrawer } from '@/components/NotesDrawer';
import { useCollaboration } from '@/hooks/useCollaboration';
import type * as monaco from 'monaco-editor';
import type { SupportedLanguage } from '@paircode/shared';

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
    starterCode: Record<string, string>;
  };
}

export default function RoomPage() {
  const params = useParams();
  const roomCode = params?.roomCode as string;
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor and Collaboration state
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [localCode, setLocalCode] = useState<string>('');
  const [realtimeToken, setRealtimeToken] = useState<string | null>(null);
  const [realtimeWsUrl, setRealtimeWsUrl] = useState<string>('ws://localhost:8080/collaboration');

  // Execution state
  const [customInput, setCustomInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeExecution, setActiveExecution] = useState<ActiveExecutionData | null>(null);

  // Notes drawer state (interviewer only)
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Timer countdown
  const [timeLeft, setTimeLeft] = useState<string>('--:--');

  // Load session metadata and realtime token
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/interviews/${roomCode}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Could not load interview room.');
      }
      const data = await res.json();
      setSession(data.interview);

      // Fetch realtime collaboration token
      const tokenRes = await fetch(`/api/interviews/${data.interview.id}/realtime-token`, {
        method: 'POST',
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        setRealtimeToken(tokenData.token);
        if (tokenData.url) setRealtimeWsUrl(tokenData.url);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to room.');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    if (roomCode) loadSession();
  }, [roomCode, loadSession]);

  // Collaborative editing hook
  const { connectionStatus, connectedUsers } = useCollaboration({
    sessionId: session?.id || '',
    token: realtimeToken,
    wsUrl: realtimeWsUrl,
    userName: session?.role === 'INTERVIEWER' ? session.interviewer.name : session?.candidate?.name || 'Candidate',
    userRole: session?.role || 'CANDIDATE',
    editor: editorInstance,
    onCodeChange: (code) => setLocalCode(code),
  });

  // Server-authoritative timer countdown & auto-end
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !session.endsAt) {
      if (session?.status === 'WAITING') {
        const m = Math.floor(session.durationSeconds / 60);
        setTimeLeft(`${m.toString().padStart(2, '0')}:00`);
      } else if (session?.status === 'COMPLETED') {
        setTimeLeft('00:00');
      }
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(session.endsAt!).getTime();
      const remainingMs = Math.max(0, end - now);

      if (remainingMs <= 0) {
        setTimeLeft('00:00');
        clearInterval(timer);
        // Automatically refresh to sync completed state
        loadSession();
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, loadSession]);

  // Periodic active-execution polling for live shared results
  useEffect(() => {
    if (!session?.id) return;

    let isPolling = true;

    async function pollActiveExecution() {
      try {
        const res = await fetch(`/api/interviews/${session!.id}/active-execution`);
        if (res.ok) {
          const data = await res.json();
          if (data.execution && isPolling) {
            setActiveExecution(data.execution);
            if (data.execution.status === 'RUNNING' || data.execution.status === 'PENDING') {
              setIsExecuting(true);
            } else {
              setIsExecuting(false);
            }
          }
        }
      } catch (err) {
        console.error('Active execution poll error:', err);
      }
    }

    pollActiveExecution();
    const interval = setInterval(pollActiveExecution, 2500);

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [session?.id]);

  // Start interview handler (Interviewer only)
  async function handleStartInterview() {
    if (!session) return;
    try {
      const res = await fetch(`/api/interviews/${session.id}/start`, {
        method: 'POST',
      });
      if (res.ok) {
        loadSession();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Could not start interview.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // End interview handler (Interviewer only)
  async function handleEndInterview() {
    if (!session) return;
    if (!confirm('Are you sure you want to end this interview? Final code will be frozen and saved.')) {
      return;
    }
    try {
      const res = await fetch(`/api/interviews/${session.id}/end`, {
        method: 'POST',
      });
      if (res.ok) {
        loadSession();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Could not end interview.');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Code execution trigger (RUN or SUBMIT)
  async function triggerExecution(kind: 'RUN' | 'SUBMIT') {
    if (!session) return;

    const currentCode = editorInstance?.getValue() || localCode;
    if (!currentCode.trim()) {
      alert('Please write code before executing.');
      return;
    }

    setIsExecuting(true);

    try {
      const res = await fetch(`/api/interviews/${session.id}/executions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          language,
          sourceCode: currentCode,
          stdin: kind === 'RUN' ? customInput : '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || 'Failed to trigger execution.');
        setIsExecuting(false);
        return;
      }

      // Poll until execution finishes
      const execId = data.executionId;
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/executions/${execId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setActiveExecution(statusData.execution);
            if (statusData.execution.status !== 'PENDING' && statusData.execution.status !== 'RUNNING') {
              setIsExecuting(false);
              clearInterval(pollTimer);
            }
          }
        } catch {
          setIsExecuting(false);
          clearInterval(pollTimer);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-editor-background text-white">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs text-muted">Entering PairCode collaboration room...</span>
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

  const isCompleted = session.status === 'COMPLETED';
  const isInterviewer = session.role === 'INTERVIEWER';

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

          <span className="text-xs font-medium text-foreground max-w-[180px] sm:max-w-[260px] truncate">
            {session.title}
          </span>

          <StatusBadge status={session.status} />
        </div>

        {/* Center: Timer & Connection Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded bg-surface-muted px-2.5 py-1 text-xs font-mono font-medium text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted" />
            <span>{timeLeft}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-success'
                  : connectionStatus === 'connecting'
                  ? 'bg-warning animate-pulse'
                  : 'bg-danger'
              }`}
            ></span>
            <span className="capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Right: Interviewer Controls, Presence & Exit */}
        <div className="flex items-center gap-2.5">
          {/* Interviewer Controls */}
          {isInterviewer && session.status === 'WAITING' && (
            <button
              onClick={handleStartInterview}
              disabled={!session.candidate}
              className="inline-flex items-center gap-1 rounded bg-success px-2.5 py-1 text-xs font-medium text-white hover:bg-success/90 transition-colors shadow-sm disabled:opacity-50"
              title={!session.candidate ? 'Waiting for candidate to join before starting' : 'Start Interview'}
            >
              <Play className="h-3 w-3 fill-current" /> Start Interview
            </button>
          )}

          {isInterviewer && session.status === 'ACTIVE' && (
            <button
              onClick={handleEndInterview}
              className="inline-flex items-center gap-1 rounded bg-danger px-2.5 py-1 text-xs font-medium text-white hover:bg-danger/90 transition-colors shadow-sm"
              title="End Interview & Save Final Code"
            >
              <Square className="h-3 w-3 fill-current" /> End Interview
            </button>
          )}

          {/* Private Notes Drawer Trigger (Interviewer Only) */}
          {isInterviewer && (
            <button
              onClick={() => setIsNotesOpen(true)}
              className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
            >
              <FileEdit className="h-3.5 w-3.5 text-primary" /> Notes
            </button>
          )}

          {isCompleted && (
            <Link
              href={`/history/${session.id}`}
              className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground"
            >
              Report <ArrowRight className="h-3 w-3" />
            </Link>
          )}

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
        <div className="w-full md:w-[40%] border-r border-border bg-surface flex flex-col overflow-y-auto">
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

        {/* Right Panel: Shared Editor & Terminal */}
        <div className="flex-1 flex flex-col bg-editor-background overflow-hidden">
          <CodeEditor
            code={localCode}
            language={language}
            onCodeChange={(val) => setLocalCode(val)}
            onLanguageChange={(lang) => setLanguage(lang)}
            onMount={(editor) => setEditorInstance(editor)}
            onRun={() => triggerExecution('RUN')}
            onSubmit={() => triggerExecution('SUBMIT')}
            isExecuting={isExecuting}
            readOnly={isCompleted}
          />

          <Terminal
            execution={activeExecution}
            isExecuting={isExecuting}
            customInput={customInput}
            onCustomInputChange={(val) => setCustomInput(val)}
          />
        </div>
      </div>

      {/* Private Notes Drawer (Interviewer only) */}
      {isInterviewer && (
        <NotesDrawer
          sessionId={session.id}
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
        />
      )}
    </div>
  );
}
