import Link from 'next/link';
import { Terminal, Users, Play, Shield, ArrowRight, Code2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-white">
              <Code2 className="h-4 w-4" />
            </div>
            <span>PairCode</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
            Real-time collaborative technical interviews
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
            Think together. Code together. Interview better.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            A quiet, refined coding interview platform where interviewers and candidates write, run, and evaluate code in real-time.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
            >
              Start an interview <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/questions"
              className="inline-flex items-center gap-2 rounded border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted transition-colors"
            >
              Browse questions
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted">
        <div className="mx-auto max-w-6xl px-4">
          © {new Date().getFullYear()} PairCode. Designed for engineering pair-programming and technical interviews.
        </div>
      </footer>
    </div>
  );
}

