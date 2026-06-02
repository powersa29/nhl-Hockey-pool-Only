'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import NotifyBell from './NotifyBell';
import { GlizzyIcon, Sun, Moon } from './icons';

const GOLF_NAV = [
  { href: '/',        label: 'Standings' },
  { href: '/live',    label: 'On Course' },
  { href: '/record',  label: 'Record Round' },
  { href: '/courses', label: 'Courses' },
  { href: '/join',    label: 'Join' },
  { href: '/rules',   label: 'How It Works' },
];

const DISC_NAV = [
  { href: '/disc',      label: 'Home' },
  { href: '/disc/live', label: 'On Course' },
];

export default function GolfHeader() {
  const path = usePathname();
  const [dark, setDark] = useState(false);
  const isDisc = path.startsWith('/disc');
  const nav = isDisc ? DISC_NAV : GOLF_NAV;

  useEffect(() => {
    const stored = localStorage.getItem('golf-theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
      document.querySelector('.golf-app')?.classList.add('dark');
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.querySelector('.golf-app')?.classList.toggle('dark', next);
    localStorage.setItem('golf-theme', next ? 'dark' : 'light');
  }

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <GlizzyIcon size={28} />
        </div>
        <div>
          <div className="brand-name">Glizzy Golf League</div>
          <div className="brand-sub">{isDisc ? 'Disc Golf' : 'Weekly 9-Hole Stroke Play'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Sport toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--chip)', borderRadius: 20, padding: 2, flexShrink: 0 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'block', padding: '4px 10px', borderRadius: 18,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: !isDisc ? 'var(--green-dark)' : 'transparent',
              color: !isDisc ? 'white' : 'var(--muted)',
            }}>Golf</span>
          </Link>
          <Link href="/disc" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'block', padding: '4px 10px', borderRadius: 18,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: isDisc ? 'var(--green-dark)' : 'transparent',
              color: isDisc ? 'white' : 'var(--muted)',
            }}>Disc</span>
          </Link>
        </div>

        <NotifyBell />
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <nav className="nav">
          {nav.map(n => (
            <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
