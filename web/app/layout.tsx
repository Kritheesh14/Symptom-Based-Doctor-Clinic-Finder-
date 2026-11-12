import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';
import { DISCLAIMER } from '@/lib/constants';
import './globals.css';

export const metadata: Metadata = {
  title: 'Symptom Finder: which specialist should I see?',
  description: 'Describe your symptoms in plain language and find the right specialist, doctor and clinic.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-muted">{DISCLAIMER}</footer>
      </body>
    </html>
  );
}
