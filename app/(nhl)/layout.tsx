import '../nhl.css';
import Header from '@/components/Header';

export default function NhlLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nhl-app" data-theme="dark">
      <div className="app">
        <Header />
        {children}
        <footer style={{ marginTop: 40, paddingTop: 20, borderTop: '2px dashed var(--line)', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          NHL 2026 Playoff Pool · Stats via NHL.com · Built for bragging rights 🏆
        </footer>
      </div>
    </div>
  );
}
