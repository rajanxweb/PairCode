'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { DifficultyBadge } from '@/components/Badge';
import { ArrowLeft, Copy, Check, ArrowRight, Loader2, Code2 } from 'lucide-react';
import Link from 'next/link';

interface QuestionOption {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topics: string[];
}

export default function NewInterviewPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionOption[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  const [title, setTitle] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post creation modal state
  const [createdSession, setCreatedSession] = useState<{
    id: string;
    roomCode: string;
    title: string;
    inviteUrl: string;
    durationSeconds: number;
    question: { id: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/questions?limit=50');
        if (!res.ok) throw new Error('Failed to load questions');
        const data = await res.json();
        setQuestions(data.questions || []);
        if (data.questions && data.questions.length > 0) {
          setSelectedQuestionId(data.questions[0].id);
        }
      } catch (err) {
        setError('Could not fetch questions. Please refresh.');
      } finally {
        setLoadingQuestions(false);
      }
    }
    fetchQuestions();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !selectedQuestionId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          questionId: selectedQuestionId,
          durationSeconds: durationMinutes * 60,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create interview');
      }

      setCreatedSession(data.interview);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyInvite() {
    if (!createdSession) return;
    navigator.clipboard.writeText(createdSession.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-2xl w-full px-4 sm:px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>

        <div className="rounded border border-border bg-surface p-6 shadow-sm">
          <div className="border-b border-border pb-4 mb-6">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Schedule a New Interview</h1>
            <p className="text-xs text-muted mt-1">Configure your coding session and generate a private invite link for your candidate.</p>
          </div>

          {error && (
            <div className="mb-4 rounded bg-danger/10 border border-danger/20 p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Interview Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Backend Engineer - Round 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Coding Question
              </label>
              {loadingQuestions ? (
                <div className="flex items-center gap-2 text-xs text-muted py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading question bank...
                </div>
              ) : (
                <select
                  value={selectedQuestionId}
                  onChange={(e) => setSelectedQuestionId(e.target.value)}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.difficulty}) — {q.topics.join(', ')}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Session Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`rounded border py-2 text-xs font-medium transition-colors ${
                      durationMinutes === mins
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingQuestions || !title.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Provisioning Room...
                </>
              ) : (
                'Create Interview Room'
              )}
            </button>
          </form>
        </div>

        {/* Post Creation Modal / Dialog */}
        {createdSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded border border-border bg-surface p-6 shadow-lg animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center gap-2 text-success mb-2 font-semibold text-sm">
                <Check className="h-4 w-4" /> Interview Room Created
              </div>
              <h2 className="text-base font-semibold text-foreground">{createdSession.title}</h2>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <span>Question: <strong className="text-foreground">{createdSession.question.title}</strong></span>
                <DifficultyBadge difficulty={createdSession.question.difficulty} />
                <span>Duration: {Math.round(createdSession.durationSeconds / 60)}m</span>
              </div>

              <div className="my-5 rounded border border-border bg-surface-muted/50 p-3">
                <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  Candidate Invitation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdSession.inviteUrl}
                    className="w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopyInvite}
                    className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-muted" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Send this private link to your candidate. It expires in 7 days and is bound upon first acceptance.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Link
                  href="/dashboard"
                  className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/room/${createdSession.roomCode}`}
                  className="inline-flex items-center gap-1.5 rounded bg-primary px-3.5 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
                >
                  Enter Room <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

