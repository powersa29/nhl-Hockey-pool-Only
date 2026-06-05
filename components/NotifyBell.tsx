'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from './icons';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const NOTIFY_INTENT_KEY = 'golf-notify-intent';

type Status = 'idle' | 'subscribed' | 'denied' | 'unsupported' | 'lost';

function useNotifyStatus() {
  const [status, setStatus] = useState<Status>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported'); return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) {
          setStatus('subscribed');
        } else if (localStorage.getItem(NOTIFY_INTENT_KEY)) {
          setStatus('lost');
        }
      })
      .catch(() => {});
  }, []);

  async function subscribe(playerId?: number) {
    if (!VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, subscription: sub.toJSON() }),
      });
      localStorage.setItem(NOTIFY_INTENT_KEY, '1');
      setStatus('subscribed');
    } catch {
      if (Notification.permission === 'denied') setStatus('denied');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      localStorage.removeItem(NOTIFY_INTENT_KEY);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }

  return { status, loading, subscribe, unsubscribe };
}

export default function NotifyBell({ playerId }: { playerId?: number }) {
  const { status, loading, subscribe, unsubscribe } = useNotifyStatus();
  if (status === 'unsupported') return null;

  if (status === 'subscribed') {
    return (
      <button className="theme-toggle" onClick={unsubscribe} disabled={loading}
        title="Turn off Monday notifications" style={{ opacity: loading ? 0.6 : 1 }}>
        <Bell size={16} />
      </button>
    );
  }
  if (status === 'denied') {
    return (
      <button className="theme-toggle" title="Notifications blocked — enable in browser settings"
        style={{ opacity: 0.35, cursor: 'default' }}>
        <BellOff size={16} />
      </button>
    );
  }
  if (status === 'lost') {
    return (
      <button className="theme-toggle" onClick={() => subscribe(playerId)} disabled={loading}
        title="Notifications disconnected — tap to reconnect"
        style={{ opacity: loading ? 0.6 : 1, color: '#b45309' }}>
        <BellOff size={16} />
      </button>
    );
  }
  return (
    <button className="theme-toggle" onClick={() => subscribe(playerId)} disabled={loading}
      title="Get Monday morning notifications" style={{ opacity: loading ? 0.6 : 1 }}>
      <BellOff size={16} />
    </button>
  );
}

export function NotifyRow({ playerId }: { playerId?: number }) {
  const { status, loading, subscribe, unsubscribe } = useNotifyStatus();

  const isOn = status === 'subscribed';
  const isDenied = status === 'denied';
  const isUnsupported = status === 'unsupported';
  const isLost = status === 'lost';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '14px 16px',
      background: isLost ? 'color-mix(in oklab, #f59e0b 6%, var(--ice-2))' : 'var(--ice-2)',
      border: `1px solid ${isLost ? 'color-mix(in oklab, #f59e0b 35%, transparent)' : 'var(--line)'}`,
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 'var(--radius)',
          background: isOn ? 'color-mix(in oklab, var(--green) 12%, transparent)' : 'var(--chip)',
          border: `1px solid ${isOn ? 'color-mix(in oklab, var(--green) 30%, transparent)' : 'var(--line)'}`,
          display: 'grid', placeItems: 'center', flexShrink: 0,
          color: isOn ? 'var(--green-dark)' : isLost ? '#b45309' : 'var(--muted)',
        }}>
          {isOn ? <Bell size={16} /> : <BellOff size={16} />}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Monday notifications</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
            {isUnsupported
              ? 'Not supported in this browser'
              : isDenied
              ? 'Blocked in browser settings — enable to turn on'
              : isLost
              ? 'Subscription was reset — tap Reconnect to restore'
              : isOn
              ? "You'll get a ping every Monday morning"
              : 'Get a nudge every Monday to kick off the week'}
          </div>
        </div>
      </div>

      {isUnsupported || isDenied ? (
        <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
          {isUnsupported ? 'Unavailable' : 'Blocked'}
        </span>
      ) : (
        <button
          onClick={isOn ? unsubscribe : () => subscribe(playerId)}
          disabled={loading}
          style={{
            padding: '7px 16px', borderRadius: 'var(--radius-pill)',
            border: `1px solid ${isOn ? 'var(--line)' : isLost ? '#b45309' : 'var(--green-dark)'}`,
            background: isOn ? 'var(--chip)' : isLost ? '#b45309' : 'var(--green-dark)',
            color: isOn ? 'var(--ink-soft)' : 'white',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            opacity: loading ? 0.6 : 1, flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {loading ? '…' : isOn ? 'Turn off' : isLost ? 'Reconnect' : 'Turn on'}
        </button>
      )}
    </div>
  );
}
