'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { Code2, LayoutDashboard, HelpCircle, History, Plus } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/questions', label: 'Question Bank', icon: HelpCircle },
    { href: '/history', label: 'History', icon: History },
  ];

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-white">
              <Code2 className="h-4 w-4" />
            </div>
            <span>PairCode</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-surface-muted text-foreground'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/interviews/new"
            className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Interview
          </Link>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}

