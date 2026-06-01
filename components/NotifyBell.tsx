'use client';

import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

type Status = 'idle' | 'subscribed' | 'denied' | 'unsupported';

export default function NotifyBell({ playerId }: { playerId?: number }) {
  const [status, setStatus] = useState<Status>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
      if (sub) setStatus('subscribed');
    }).catch(() => {});
  }, []);

  async function subscribe() {
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
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'unsupported') return null;

  if (status === 'subscribed') {
    return (
      <button
        className="theme-toggle"
        onClick={unsubscribe}
        disabled={loading}
        title="Turn off Monday notifications"
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        🔔
      </button>
    );
  }

  if (status === 'denied') {
    return (
      <button
        className="theme-toggle"
        title="Notifications blocked — enable in browser settings"
        style={{ opacity: 0.4, cursor: 'default' }}
      >
        🔕
      </button>
    );
  }

  return (
    <button
      className="theme-toggle"
      onClick={subscribe}
      disabled={loading}
      title="Get Monday morning notifications"
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      🔕
    </button>
  );
}
