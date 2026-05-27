'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/',         label: 'Standings' },
  { href: '/record',   label: 'Record Round' },
  { href: '/courses',  label: 'Courses' },
  { href: '/join',     label: 'Join' },
  { href: '/rules',    label: 'How It Works' },
];

export default function GolfHeader() {
  const path = usePathname();

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">⛳</div>
        <div>
          <div className="brand-name">Glizzy Golf League 🌭</div>
          <div className="brand-sub">Weekly 9-Hole Stroke Play</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
