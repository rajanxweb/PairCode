'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';
import { Plus, ArrowRight, Play, CheckCircle2, Clock, Calendar, Users, Loader2 } from 'lucide-react';

interface InterviewItem {
  id: string;
  roomCode: string;
  title: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  durationSeconds: number;
  role: 'INTERVIEWER' | 'CANDIDATE';
  interviewer: { id: string; name: string; email: string };
  candidate: { id: string; name: string; email: string } | null;
  question: { id: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' };
  createdAt: string;
}

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInterviews() {
      try {
        const res = await fetch('/api/interviews');
        if (!res.ok) throw new Error('Failed to load interviews');
        const data = await res.json();
        setInterviews(data.interviews || []);
      } catch (err) {
        setError('Could not load interviews. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    loadInterviews();
  }, []);

  const total = interviews.length;
  const active = interviews.filter((i) => i.status === 'ACTIVE').length;
  const waiting = interviews.filter((i) => i.status === 'WAITING').length;
  const completed = interviews.filter((i) => i.status === 'COMPLETED').length;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-8">
        {/* Welcome Area */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Interviewer Dashboard</h1>
            <p className="text-xs text-muted mt-1">Manage technical interviews, track active rooms, and review candidates.</p>
          </div>
          <Link
            href="/interviews/new"
            className="inline-flex items-center justify-center gap-1.5 rounded bg-primary px-3.5 py-2 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Create Interview
          </Link>
        </div>

        {/* Real Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          <div className="rounded border border-border bg-surface p-4">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Total Sessions</span>
            <div className="mt-1 text-2xl font-semibold text-foreground">{loading ? '-' : total}</div>
          </div>
          <div className="rounded border border-border bg-surface p-4">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Active</span>
            <div className="mt-1 text-2xl font-semibold text-success">{loading ? '-' : active}</div>
          </div>
          <div className="rounded border border-border bg-surface p-4">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Waiting Candidate</span>
            <div className="mt-1 text-2xl font-semibold text-warning">{loading ? '-' : waiting}</div>
          </div>
          <div className="rounded border border-border bg-surface p-4">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Completed</span>
            <div className="mt-1 text-2xl font-semibold text-muted">{loading ? '-' : completed}</div>
          </div>
        </div>

        {/* Recent Interviews */}
        <div className="rounded border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface-muted/30 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Recent Interviews</h2>
            <Link href="/history" className="text-xs text-primary hover:underline">
              View History →
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs">Loading sessions...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-xs text-danger">{error}</div>
          ) : interviews.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-muted/50 mb-3" />
              <h3 className="text-sm font-medium text-foreground">No interviews scheduled yet</h3>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
                Create an interview session, select a problem from the question bank, and share the invitation link.
              </p>
              <Link
                href="/interviews/new"
                className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first interview
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {interviews.map((session) => (
                <div
                  key={session.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={session.status === 'COMPLETED' ? `/history/${session.id}` : `/room/${session.roomCode}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {session.title}
                      </Link>
                      <StatusBadge status={session.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span>Question: <strong className="font-medium text-foreground">{session.question.title}</strong></span>
                      <DifficultyBadge difficulty={session.question.difficulty} />
                      <span>Candidate: {session.candidate ? session.candidate.name : <em className="text-muted/70">Unassigned</em>}</span>
                      <span>Duration: {Math.round(session.durationSeconds / 60)}m</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {session.status === 'COMPLETED' ? (
                      <Link
                        href={`/history/${session.id}`}
                        className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
                      >
                        View Report
                      </Link>
                    ) : (
                      <Link
                        href={`/room/${session.roomCode}`}
                        className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
                      >
                        Enter Room <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

