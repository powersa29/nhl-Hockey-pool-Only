import './golf.css';
import GolfHeader from '@/components/GolfHeader';

export default function GolfLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="golf-app">
      <div className="golf-inner">
        <GolfHeader />
        {children}
        <footer style={{ marginTop: 48, paddingTop: 20, borderTop: '2px dashed var(--line)', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
          Golf League · 9-hole weekly stroke play · Handicap-adjusted net scoring
        </footer>
      </div>
    </div>
  );
}
