'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Check, Loader2, Lock } from 'lucide-react';
import type { InterviewNoteContent } from '@paircode/shared';

interface NotesDrawerProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesDrawer({ sessionId, isOpen, onClose }: NotesDrawerProps) {
  const [content, setContent] = useState<InterviewNoteContent>({
    approach: '',
    technical: '',
    communication: '',
    strengths: '',
    areasForImprovement: '',
    overall: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);

  // Load existing notes
  useEffect(() => {
    async function loadNotes() {
      if (!isOpen || !sessionId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/interviews/${sessionId}/notes`);
        if (res.ok) {
          const data = await res.json();
          if (data.note?.content) {
            setContent(data.note.content);
          }
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, [isOpen, sessionId]);

  // Save notes
  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/interviews/${sessionId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-surface-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Private Interviewer Notes
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {saving ? (
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <Loader2 className="h-3 w-3 animate-spin text-primary" /> Saving...
            </span>
          ) : savedTime ? (
            <span className="flex items-center gap-1 text-[11px] text-success">
              <Check className="h-3 w-3" /> Saved {savedTime}
            </span>
          ) : null}

          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-2 bg-primary/5 border-b border-primary/10 px-4 text-[11px] text-primary">
        These notes are strictly private. The candidate cannot view or retrieve this feedback.
      </div>

      {/* Content Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Problem-Solving Approach
              </label>
              <textarea
                rows={3}
                placeholder="How did the candidate analyze the problem and explore edge cases?"
                value={content.approach}
                onChange={(e) => setContent({ ...content, approach: e.target.value })}
                className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Technical Understanding & Code Quality
              </label>
              <textarea
                rows={3}
                placeholder="Code structure, idiomatic syntax, data structures, complexity..."
                value={content.technical}
                onChange={(e) => setContent({ ...content, technical: e.target.value })}
                className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Communication & Collaboration
              </label>
              <textarea
                rows={2}
                placeholder="Did they articulate their thoughts clearly and take feedback?"
                value={content.communication}
                onChange={(e) => setContent({ ...content, communication: e.target.value })}
                className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Key Strengths
              </label>
              <textarea
                rows={2}
                placeholder="What did they do exceptionally well?"
                value={content.strengths}
                onChange={(e) => setContent({ ...content, strengths: e.target.value })}
                className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Areas for Improvement
              </label>
              <textarea
                rows={2}
                placeholder="Where did they struggle or leave room for optimization?"
                value={content.areasForImprovement}
                onChange={(e) => setContent({ ...content, areasForImprovement: e.target.value })}
                className="w-full rounded border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Overall Recommendation
              </label>
              <select
                value={content.overall}
                onChange={(e) => setContent({ ...content, overall: e.target.value })}
                className="w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select recommendation...</option>
                <option value="Strong Hire">Strong Hire</option>
                <option value="Hire">Hire</option>
                <option value="Leaning Hire">Leaning Hire</option>
                <option value="Leaning No Hire">Leaning No Hire</option>
                <option value="No Hire">No Hire</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="h-12 border-t border-border px-4 flex items-center justify-end gap-2 bg-surface shrink-0">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> Save Feedback
        </button>
      </div>
    </div>
  );
}

