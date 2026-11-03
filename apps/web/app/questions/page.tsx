'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DifficultyBadge } from '@/components/Badge';
import { Search, Filter, HelpCircle, ArrowRight, Loader2 } from 'lucide-react';

interface QuestionItem {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topics: string[];
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');

  useEffect(() => {
    async function fetchQuestions() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search.trim()) queryParams.set('search', search.trim());
        if (difficulty !== 'ALL') queryParams.set('difficulty', difficulty);
        if (selectedTopic !== 'ALL') queryParams.set('topic', selectedTopic);
        queryParams.set('limit', '50');

        const res = await fetch(`/api/questions?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Failed to load questions');
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchQuestions, 250);
    return () => clearTimeout(timer);
  }, [search, difficulty, selectedTopic]);

  const allTopics = [
    'ALL',
    'Arrays',
    'Strings',
    'Hash maps',
    'Two-pointer',
    'Sorting',
    'Searching',
    'Basic recursion',
    'Stack',
    'Queue',
    'Simple dynamic programming',
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-8">
        <div className="border-b border-border pb-6 mb-6">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Coding Question Bank</h1>
          <p className="text-xs text-muted mt-1">
            Curated, interview-ready programming problems with automated test suites for live technical evaluation.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted/60" />
            <input
              type="text"
              placeholder="Search problems by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border border-border bg-surface pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="rounded border border-border bg-surface px-2.5 py-2 text-xs text-foreground focus:outline-none"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="rounded border border-border bg-surface px-2.5 py-2 text-xs text-foreground focus:outline-none"
            >
              {allTopics.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Topics' : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Questions Table */}
        <div className="rounded border border-border bg-surface overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs">Loading question bank...</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-muted text-xs">
              No questions found matching your filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted/20 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/questions/${q.slug}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {q.title}
                      </Link>
                      <DifficultyBadge difficulty={q.difficulty} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {q.topics.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/questions/${q.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline self-end sm:self-center"
                  >
                    View Problem <ArrowRight className="h-3 w-3" />
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

