'use client';

import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { MonacoBinding } from 'y-monaco';
import type * as monaco from 'monaco-editor';

export interface CollaborationUser {
  id: string;
  name: string;
  role: 'INTERVIEWER' | 'CANDIDATE';
  color: string;
}

export interface UseCollaborationOptions {
  sessionId: string;
  token: string | null;
  wsUrl: string;
  userName: string;
  userRole: 'INTERVIEWER' | 'CANDIDATE';
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onCodeChange?: (code: string) => void;
}

export function useCollaboration({
  sessionId,
  token,
  wsUrl,
  userName,
  userRole,
  editor,
  onCodeChange,
}: UseCollaborationOptions) {
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  >('connecting');
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  // Participant stable colors
  const userColor = userRole === 'INTERVIEWER' ? '#326B57' : '#B77935';

  useEffect(() => {
    if (!sessionId || !token || !wsUrl) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const documentName = `paircode:session:${sessionId}`;

    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: ydoc,
      token,
      onConnect() {
        setConnectionStatus('connected');
      },
      onClose() {
        setConnectionStatus('disconnected');
      },
      onStatus({ status }) {
        if (status === 'connecting') setConnectionStatus('connecting');
        else if (status === 'connected') setConnectionStatus('connected');
        else if (status === 'disconnected') setConnectionStatus('disconnected');
      },
    });

    providerRef.current = provider;

    // Configure Yjs Awareness
    const awareness = provider.awareness;
    if (awareness) {
      awareness.setLocalStateField('user', {
        name: userName,
        role: userRole,
        color: userColor,
      });

      awareness.on('change', () => {
        const states = Array.from(awareness.getStates().values()) as Array<{
          user?: CollaborationUser;
        }>;
        const users = states
          .map((s) => s.user)
          .filter((u): u is CollaborationUser => Boolean(u && u.name));
        setConnectedUsers(users);
      });
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      provider.destroy();
      ydoc.destroy();
    };
  }, [sessionId, token, wsUrl, userName, userRole, userColor]);

  // Attach y-monaco binding when editor and provider are ready
  useEffect(() => {
    if (!editor || !ydocRef.current || !providerRef.current) return;

    const ydoc = ydocRef.current;
    const provider = providerRef.current;
    const ytext = ydoc.getText('code');
    const model = editor.getModel();

    if (!model) return;

    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    const binding = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      provider.awareness
    );

    bindingRef.current = binding;

    // Listen for code updates to trigger parent callbacks
    const observer = () => {
      if (onCodeChange) {
        onCodeChange(ytext.toString());
      }
    };
    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
      binding.destroy();
      bindingRef.current = null;
    };
  }, [editor, onCodeChange]);

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    connectionStatus,
    connectedUsers,
  };
}

