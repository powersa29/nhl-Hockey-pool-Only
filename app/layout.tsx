import type { Metadata } from 'next';
import './globals.css';
import GolfHeader from '@/components/GolfHeader';

export const metadata: Metadata = {
  title: 'Golf League',
  description: 'Weekly 9-hole golf league — track rounds, handicaps, and standings.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="app">
          <GolfHeader />
          {children}
          <footer style={{ marginTop: 48, paddingTop: 20, borderTop: '2px dashed var(--line)', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Golf League · 9-hole weekly stroke play · Handicap-adjusted net scoring
          </footer>
        </div>
      </body>
    </html>
  );
}
