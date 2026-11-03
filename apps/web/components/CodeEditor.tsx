'use client';

import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { Play, Send, Loader2 } from 'lucide-react';
import type { SupportedLanguage } from '@paircode/shared';

interface CodeEditorProps {
  code: string;
  language: SupportedLanguage;
  onCodeChange: (value: string) => void;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onMount?: OnMount;
  onRun: () => void;
  onSubmit: () => void;
  isExecuting: boolean;
  readOnly?: boolean;
}

export function CodeEditor({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onMount,
  onRun,
  onSubmit,
  isExecuting,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    if (onMount) {
      onMount(editor, monacoInstance);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-editor-background overflow-hidden">
      {/* Editor Action Toolbar */}
      <div className="h-10 border-b border-white/10 bg-[#171C19] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-muted uppercase font-medium">Language:</label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            disabled={readOnly}
            className="rounded border border-white/10 bg-[#121614] px-2 py-1 text-xs text-white focus:outline-none focus:border-primary"
          >
            <option value="python">Python (3.x)</option>
            <option value="javascript">JavaScript (Node.js)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={isExecuting || readOnly}
            className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Execute against custom stdin input"
          >
            {isExecuting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 text-success" />
            )}
            Run
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isExecuting || readOnly}
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
            title="Run against all automated test cases"
          >
            {isExecuting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Submit
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(val) => onCodeChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 13,
            lineNumbers: 'on',
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: language === 'python' ? 4 : 2,
            insertSpaces: true,
            suggestOnTriggerCharacters: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 12, bottom: 12 },
          }}
          loading={
            <div className="flex h-full items-center justify-center text-xs text-muted font-mono">
              <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" /> Loading Monaco Editor...
            </div>
          }
        />
      </div>
    </div>
  );
}

