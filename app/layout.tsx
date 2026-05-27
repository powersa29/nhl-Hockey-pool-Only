import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NHL 2026 Playoff Pool',
  description: 'Build your 16-team roster. Points roll in live from every playoff game.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
