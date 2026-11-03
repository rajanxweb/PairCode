'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';
import { History, ArrowRight, Loader2, Calendar, Clock, UserCheck } from 'lucide-react';

interface HistorySession {
  id: string;
  roomCode: string;
  title: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  durationSeconds: number;
  endedAt: string | null;
  role: 'INTERVIEWER' | 'CANDIDATE';
  interviewer: { id: string; name: string };
  candidate: { id: string; name: string } | null;
  question: { id: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' };
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/interviews');
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        const completedOnly = (data.interviews || []).filter(
          (i: HistorySession) => i.status === 'COMPLETED'
        );
        setHistory(completedOnly);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-8">
        <div className="border-b border-border pb-6 mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Completed Interview History</h1>
          <p className="text-xs text-muted mt-1">
            Review final code submissions, interview outcomes, and private interviewer evaluations.
          </p>
        </div>

        <div className="rounded border border-border bg-surface overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs">Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted space-y-2">
              <History className="mx-auto h-8 w-8 text-muted/40 mb-2" />
              <p className="font-medium text-foreground">No completed interviews yet</p>
              <p className="max-w-xs mx-auto">
                Completed interviews will appear here with final source code snapshots and performance reports.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((session) => (
                <div
                  key={session.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-muted/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/history/${session.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {session.title}
                      </Link>
                      <StatusBadge status={session.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span>Problem: <strong className="font-medium text-foreground">{session.question.title}</strong></span>
                      <DifficultyBadge difficulty={session.question.difficulty} />
                      <span>Candidate: {session.candidate ? session.candidate.name : 'Unknown'}</span>
                      <span>Ended: {session.endedAt ? new Date(session.endedAt).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>

                  <Link
                    href={`/history/${session.id}`}
                    className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors self-end sm:self-center"
                  >
                    View Report <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

