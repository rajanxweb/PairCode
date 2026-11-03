'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DifficultyBadge, StatusBadge } from '@/components/Badge';
import { ArrowLeft, Clock, Calendar, CheckCircle2, User, FileText, Loader2, Code2 } from 'lucide-react';

interface ReportData {
  id: string;
  roomCode: string;
  title: string;
  status: string;
  durationSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  finalCode: string | null;
  finalLanguage: string | null;
  role: 'INTERVIEWER' | 'CANDIDATE';
  interviewer: { id: string; name: string; email: string };
  candidate: { id: string; name: string; email: string } | null;
  question: {
    id: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    statement: string;
    topics: string[];
  };
}

export default function HistoryReportPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/interviews/${sessionId}`);
        if (!res.ok) throw new Error('Interview report not found.');
        const data = await res.json();
        setReport(data.interview);
      } catch (err: any) {
        setError(err.message || 'Failed to load report.');
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) loadReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-base font-semibold text-danger">Report Unavailable</h2>
          <p className="text-xs text-muted mt-2 mb-4">{error}</p>
          <Link href="/history" className="text-xs text-primary hover:underline">
            ← Back to History
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 py-8">
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Completed History
        </Link>

        <div className="rounded border border-border bg-surface p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">{report.title}</h1>
                <StatusBadge status={report.status as any} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
                <span>Interviewer: <strong className="text-foreground">{report.interviewer.name}</strong></span>
                <span>Candidate: <strong className="text-foreground">{report.candidate?.name || 'Unassigned'}</strong></span>
                <span>Room Code: <strong className="font-mono text-foreground">{report.roomCode}</strong></span>
              </div>
            </div>

            <div className="text-xs text-muted bg-surface-muted px-3 py-2 rounded border border-border self-start sm:self-auto">
              <div>Ended: {report.endedAt ? new Date(report.endedAt).toLocaleString() : 'N/A'}</div>
              <div>Duration: {Math.round(report.durationSeconds / 60)} minutes</div>
            </div>
          </div>

          {/* Question Summary */}
          <div className="rounded border border-border bg-surface-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Problem Assigned:</h2>
              <span className="text-sm font-semibold text-foreground">{report.question.title}</span>
              <DifficultyBadge difficulty={report.question.difficulty} />
            </div>
            <div className="text-xs text-muted line-clamp-3">
              {report.question.statement}
            </div>
          </div>

          {/* Final Code Snapshot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-primary" /> Final Submitted Code
              </h2>
              <span className="text-[11px] font-mono text-muted">
                Language: {report.finalLanguage || 'python'}
              </span>
            </div>

            <div className="rounded border border-border bg-editor-background text-white p-4 font-mono text-xs overflow-x-auto max-h-[400px]">
              <pre>{report.finalCode || '// No code submitted or saved during this session.'}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

