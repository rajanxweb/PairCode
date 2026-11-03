import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'PairCode — Real-time Technical Coding Interview Platform',
  description: 'Think together. Code together. Interview better.',
};

const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_bW9jay1rZXktZm9yLWJ1aWxkaW5nLXBhaXJjb2RlLmNsZXJrLmFjY291bnRzLmRldiQ';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

