'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/golf',           label: 'Standings' },
  { href: '/golf/record',    label: 'Record Round' },
  { href: '/golf/courses',   label: 'Courses' },
  { href: '/golf/join',      label: 'Join' },
  { href: '/golf/rules',     label: 'How It Works' },
];

export default function GolfHeader() {
  const path = usePathname();

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">⛳</div>
        <div>
          <div className="brand-name">Golf League</div>
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
