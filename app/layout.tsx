import type { Metadata } from 'next';
import './globals.css';
import './golf.css';
import GolfHeader from '@/components/GolfHeader';

export const metadata: Metadata = {
  title: 'Glizzy Golf League',
  description: '9-hole weekly stroke play. Handicap-adjusted net scoring.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="golf-app">
          <div className="golf-inner">
            <GolfHeader />
            {children}
            <footer style={{ marginTop: 48, paddingTop: 20, borderTop: '2px dashed var(--line)', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
              Glizzy Golf League 🌭 · 9-hole weekly stroke play · Handicap-adjusted net scoring
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
