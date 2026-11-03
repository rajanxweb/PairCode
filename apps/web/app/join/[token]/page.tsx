'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Code2, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function JoinInterviewPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    id: string;
    roomCode: string;
    title: string;
    role: string;
  } | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Could not join interview.');
      }
      setSessionInfo(data.session);
      // Redirect to room
      router.push(`/room/${data.session.roomCode}`);
    } catch (err: any) {
      setError(err.message || 'Invitation is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded border border-border bg-surface p-6 shadow-sm text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-primary text-white mb-4">
          <Code2 className="h-6 w-6" />
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          PairCode Interview Invitation
        </h1>
        <p className="text-xs text-muted mt-1.5 mb-6">
          You have been invited to enter a collaborative technical interview room.
        </p>

        {error ? (
          <div className="rounded border border-danger/20 bg-danger/10 p-4 text-xs text-danger text-left space-y-2 mb-6">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4" /> Unable to Join
            </div>
            <p>{error}</p>
            <div className="pt-2">
              <Link href="/" className="text-primary hover:underline">
                Return to home page
              </Link>
            </div>
          </div>
        ) : !isLoaded ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !isSignedIn ? (
          <div className="space-y-4">
            <p className="text-xs text-muted bg-surface-muted/50 p-3 rounded border border-border">
              Please sign in with your candidate account before accepting this invitation.
            </p>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(`/join/${token}`)}`}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded bg-primary py-2.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
            >
              Sign In to Join <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded bg-primary py-2.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Entering Room...
                </>
              ) : (
                <>
                  Accept & Enter Interview Room <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

