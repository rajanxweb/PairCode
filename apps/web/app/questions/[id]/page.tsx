'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DifficultyBadge } from '@/components/Badge';
import { ArrowLeft, Play, Plus, Loader2, Code2, CheckCircle2 } from 'lucide-react';

interface QuestionDetail {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topics: string[];
  statement: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  sampleCases: Array<{ id: string; input: string; expectedOutput: string; order: number }>;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestion() {
      try {
        const res = await fetch(`/api/questions/${id}`);
        if (!res.ok) throw new Error('Question not found');
        const data = await res.json();
        setQuestion(data.question);
      } catch (err: any) {
        setError(err.message || 'Failed to load question');
      } finally {
        setLoading(false);
      }
    }
    if (id) loadQuestion();
  }, [id]);

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

  if (error || !question) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-base font-semibold text-danger">Question Not Found</h2>
          <p className="text-xs text-muted mt-2 mb-4">{error}</p>
          <Link href="/questions" className="text-xs text-primary hover:underline">
            ← Back to Question Bank
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/questions"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Questions
          </Link>

          <Link
            href="/interviews/new"
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Create Interview with this Problem
          </Link>
        </div>

        <div className="rounded border border-border bg-surface p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{question.title}</h1>
              <DifficultyBadge difficulty={question.difficulty} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {question.topics.map((t) => (
                <span
                  key={t}
                  className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Statement */}
          <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line text-xs sm:text-sm leading-relaxed">
            {question.statement}
          </div>

          {/* Examples */}
          {question.examples && question.examples.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Examples</h2>
              {question.examples.map((ex, i) => (
                <div key={i} className="rounded border border-border bg-surface-muted/40 p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-foreground">Example {i + 1}:</div>
                  <div>
                    <span className="text-muted">Input: </span>
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] border border-border">
                      {ex.input.replace(/\n/g, ' ')}
                    </code>
                  </div>
                  <div>
                    <span className="text-muted">Output: </span>
                    <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] border border-border">
                      {ex.output.replace(/\n/g, ' ')}
                    </code>
                  </div>
                  {ex.explanation && (
                    <div className="text-muted text-[11px]">
                      <em>Explanation: {ex.explanation}</em>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {question.constraints && question.constraints.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Constraints</h2>
              <ul className="list-disc list-inside space-y-1 text-xs text-muted">
                {question.constraints.map((c, i) => (
                  <li key={i} className="font-mono text-[11px] text-foreground/80">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Visible Sample Cases */}
          {question.sampleCases && question.sampleCases.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Sample Test Cases</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.sampleCases.map((tc) => (
                  <div key={tc.id} className="rounded border border-border bg-background p-3 text-xs space-y-1">
                    <span className="text-[10px] font-medium text-muted uppercase">Case {tc.order}</span>
                    <div className="font-mono text-[11px] bg-surface p-1.5 rounded border border-border">
                      <div className="text-muted text-[10px]">stdin:</div>
                      {tc.input}
                    </div>
                    <div className="font-mono text-[11px] bg-surface p-1.5 rounded border border-border">
                      <div className="text-muted text-[10px]">expected stdout:</div>
                      {tc.expectedOutput}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

