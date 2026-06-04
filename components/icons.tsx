// Custom SVGs for golf-specific concepts + re-exports from lucide-react

// Hotdog with a golf flag sticking out — the Glizzy Golf mascot
export function GlizzyIcon({
  size = 24, className = '',
}: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}
      aria-hidden="true"
    >
      {/* Top bun */}
      <path
        d="M7 13 C7 9.5 10 7 16 7 C22 7 25 9.5 25 13 L24 14 L8 14 Z"
        fill="#f5c069" stroke="#d4943a" strokeWidth="0.6"
      />
      {/* Bottom bun */}
      <path
        d="M8 18 L24 18 L25 19 C25 22.5 22 25 16 25 C10 25 7 22.5 7 19 Z"
        fill="#f5c069" stroke="#d4943a" strokeWidth="0.6"
      />
      {/* Frank / sausage */}
      <rect x="6" y="14" width="20" height="4" rx="2" fill="#c0392b" />
      {/* Highlight on frank */}
      <path d="M8 15.5 Q16 15 24 15.5" stroke="#e74c3c" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      {/* Mustard squiggle */}
      <path
        d="M9 13.5 Q11 11.5 13 13.5 Q15 15.5 17 13.5 Q19 11.5 21 13.5"
        stroke="#f0b429" strokeWidth="1.1" strokeLinecap="round" fill="none"
      />
      {/* Golf flag pole */}
      <line x1="19" y1="4" x2="19" y2="14" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.95" />
      {/* Golf flag */}
      <path d="M19 4.5 L24 6.5 L19 8.5 Z" fill="white" opacity="0.95" />
    </svg>
  );
}
export {
  Sun, Moon, Bell, BellOff, Search, MapPin, Trophy,
  Download, Flag, Activity, CheckCircle, AlertCircle,
  ChevronDown, ChevronRight, ArrowLeft, X, Check,
} from 'lucide-react';

// A proper golf pin — pole + triangular flag + ground shadow
export function GolfPin({
  size = 20, color = 'currentColor', className = '',
}: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}
      aria-hidden="true"
    >
      {/* Pole */}
      <line x1="6" y1="2.5" x2="6" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {/* Flag */}
      <path d="M6 3.5 L15 7 L6 10.5 Z" fill={color} />
      {/* Ground ellipse */}
      <ellipse cx="6" cy="17.5" rx="3.2" ry="1.1" fill={color} opacity="0.25" />
    </svg>
  );
}

// A golf ball with dimple lines
export function GolfBall({
  size = 20, color = 'currentColor', className = '',
}: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" stroke={color} strokeWidth="1.5" />
      <path d="M6.5 10 Q10 6.5 13.5 10" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <path d="M6.5 10 Q10 13.5 13.5 10" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// Trophy cup — more detailed than lucide's
export function TrophyCup({
  size = 20, color = 'currentColor', className = '',
}: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}
      aria-hidden="true"
    >
      <path d="M6 2h8v6a4 4 0 0 1-8 0V2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 4H3a1 1 0 0 0-1 1v1a3 3 0 0 0 4 2.83" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 4h3a1 1 0 0 1 1 1v1a3 3 0 0 1-4 2.83" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 12v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 16h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 9.5 L10 11 L11.5 9.5" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

// Medal — for rank positions
export function Medal({
  size = 18, rank = 1, className = '',
}: { size?: number; rank: 1 | 2 | 3; className?: string }) {
  const colors: Record<number, { bg: string; stroke: string; text: string }> = {
    1: { bg: '#fef3c7', stroke: '#d97706', text: '#92400e' },
    2: { bg: '#f1f5f9', stroke: '#94a3b8', text: '#475569' },
    3: { bg: '#f5f3ff', stroke: '#a78bfa', text: '#5b21b6' },
  };
  const c = colors[rank];
  return (
    <svg
      width={size} height={size} viewBox="0 0 18 18" fill="none"
      xmlns="http://www.w3.org/2000/svg" className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="7.5" fill={c.bg} stroke={c.stroke} strokeWidth="1.2" />
      <text
        x="9" y="13" textAnchor="middle"
        fontSize="9" fontWeight="700" fill={c.text}
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
      >
        {rank}
      </text>
    </svg>
  );
}
