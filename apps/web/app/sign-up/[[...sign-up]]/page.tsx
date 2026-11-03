import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { Code2 } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white">
            <Code2 className="h-5 w-5" />
          </div>
          <span className="text-xl">PairCode</span>
        </Link>
        <p className="text-xs text-muted">Create your PairCode account</p>
      </div>

      <div className="w-full max-w-sm rounded border border-border bg-surface p-6 shadow-sm">
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary hover:bg-primary-hover text-sm font-medium',
              footerActionLink: 'text-primary hover:text-primary-hover',
              card: 'shadow-none p-0',
              rootBox: 'w-full',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}

