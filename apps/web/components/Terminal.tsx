'use client';

import React, { useState } from 'react';
import { Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, AlertTriangle, Play, ChevronDown, ChevronUp } from 'lucide-react';

export interface CaseResultItem {
  id: string;
  caseNumber: number;
  isHidden: boolean;
  status: string;
  stdout: string | null;
  stderr: string | null;
  executionTimeMs: number | null;
  memoryKb: number | null;
}

export interface ActiveExecutionData {
  id: string;
  kind: 'RUN' | 'SUBMIT';
  language: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalPassed: number;
  totalFailed: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  caseResults: CaseResultItem[];
}

interface TerminalProps {
  execution: ActiveExecutionData | null;
  isExecuting: boolean;
  customInput: string;
  onCustomInputChange: (val: string) => void;
}

export function Terminal({
  execution,
  isExecuting,
  customInput,
  onCustomInputChange,
}: TerminalProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'testcases' | 'input'>('output');
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="h-9 border-t border-white/10 bg-[#121614] px-4 flex items-center justify-between text-white text-xs select-none">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <TerminalIcon className="h-3.5 w-3.5" />
          <span>Terminal (Minimized)</span>
          {execution && (
            <span className="ml-2 font-medium text-foreground text-xs">
              Status: {execution.status}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="text-muted hover:text-white transition-colors"
          title="Expand Terminal"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-64 border-t border-white/10 bg-[#121614] flex flex-col text-white font-mono text-xs select-text">
      {/* Terminal Tab Bar */}
      <div className="h-8 border-b border-white/10 bg-[#171C19] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              activeTab === 'output'
                ? 'bg-white/10 text-white'
                : 'text-muted hover:text-white/80'
            }`}
          >
            Output
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              activeTab === 'testcases'
                ? 'bg-white/10 text-white'
                : 'text-muted hover:text-white/80'
            }`}
          >
            Test Cases {execution?.caseResults?.length ? `(${execution.totalPassed}/${execution.caseResults.length})` : ''}
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
              activeTab === 'input'
                ? 'bg-white/10 text-white'
                : 'text-muted hover:text-white/80'
            }`}
          >
            Custom Stdin
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {isExecuting ? (
            <span className="flex items-center gap-1.5 text-warning text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse"></span>
              Executing in sandbox...
            </span>
          ) : execution ? (
            <span
              className={`text-[11px] font-medium ${
                execution.totalFailed === 0 && execution.caseResults.length > 0
                  ? 'text-success'
                  : execution.errorMessage
                  ? 'text-danger'
                  : 'text-muted'
              }`}
            >
              {execution.kind} — {execution.status}
            </span>
          ) : (
            <span className="text-[11px] text-muted">IDLE</span>
          )}

          <button
            onClick={() => setCollapsed(true)}
            className="text-muted hover:text-white transition-colors"
            title="Minimize Terminal"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal Tab Content */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
        {activeTab === 'output' && (
          <div className="space-y-2">
            {!execution && !isExecuting && (
              <div className="text-muted text-[11px]">
                Program output, compiler messages, and errors will appear here after you click RUN or SUBMIT.
              </div>
            )}

            {isExecuting && (
              <div className="text-warning text-xs animate-pulse">
                &gt; Submitting job to Judge0 sandbox runtime...
              </div>
            )}

            {execution && (
              <>
                {execution.errorMessage && (
                  <div className="rounded bg-danger/10 border border-danger/20 p-2.5 text-danger text-xs whitespace-pre-wrap">
                    {execution.errorMessage}
                  </div>
                )}

                {execution.caseResults.length > 0 && execution.caseResults[0].stdout && (
                  <div>
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Standard Output</div>
                    <pre className="text-emerald-400 bg-black/40 p-2.5 rounded whitespace-pre-wrap">
                      {execution.caseResults[0].stdout}
                    </pre>
                  </div>
                )}

                {execution.caseResults.length > 0 && execution.caseResults[0].stderr && (
                  <div>
                    <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Standard Error</div>
                    <pre className="text-red-400 bg-black/40 p-2.5 rounded whitespace-pre-wrap">
                      {execution.caseResults[0].stderr}
                    </pre>
                  </div>
                )}

                {execution.caseResults.length > 0 && (
                  <div className="flex items-center gap-4 text-[10px] text-muted pt-2 border-t border-white/5">
                    {execution.caseResults[0].executionTimeMs && (
                      <span>Runtime: {Math.round(execution.caseResults[0].executionTimeMs)} ms</span>
                    )}
                    {execution.caseResults[0].memoryKb && (
                      <span>Memory: {Math.round(execution.caseResults[0].memoryKb / 1024)} MB</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'testcases' && (
          <div className="space-y-2">
            {!execution || execution.caseResults.length === 0 ? (
              <div className="text-muted text-[11px]">
                Click SUBMIT to run and evaluate against the complete question test suite.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {execution.caseResults.map((tc) => (
                  <div
                    key={tc.id}
                    className={`rounded border p-2.5 flex items-center justify-between text-xs ${
                      tc.status === 'ACCEPTED'
                        ? 'border-success/30 bg-success/5'
                        : 'border-danger/30 bg-danger/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tc.status === 'ACCEPTED' ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-danger" />
                      )}
                      <span className="font-medium text-white">
                        Case {tc.caseNumber} {tc.isHidden ? '(Hidden Test)' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span
                        className={tc.status === 'ACCEPTED' ? 'text-success' : 'text-danger'}
                      >
                        {tc.status}
                      </span>
                      {tc.executionTimeMs && (
                        <span className="text-muted">{Math.round(tc.executionTimeMs)}ms</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'input' && (
          <div className="h-full flex flex-col space-y-2">
            <div className="text-[11px] text-muted">
              Supply custom standard input (stdin) for RUN mode:
            </div>
            <textarea
              value={customInput}
              onChange={(e) => onCustomInputChange(e.target.value)}
              placeholder="e.g. 4\n2 7 11 15\n9"
              className="flex-1 w-full rounded bg-black/40 border border-white/10 p-2 text-xs font-mono text-white placeholder:text-muted/40 focus:outline-none focus:border-primary resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

