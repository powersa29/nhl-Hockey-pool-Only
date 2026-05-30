'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface LivePin {
  player_id: number;
  player_name: string;
  lat: number;
  lng: number;
  course_id: number | null;
}

interface Props {
  /** If provided, map is centered here and shows a ⛳ flag */
  center?: { lat: number; lng: number; label: string };
  /** Course ID to filter live pins (show only players on this course) */
  filterCourseId?: number;
  liveLocations?: LivePin[];
  height?: number;
  zoom?: number;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase();
}

const COLORS = ['#15803d','#1d4ed8','#b45309','#7c3aed','#dc2626','#0891b2'];

export default function GolfMap({
  center, filterCourseId, liveLocations = [], height = 340, zoom = 16,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const lRef         = useRef<any>(null);
  const pinRefs      = useRef<any[]>([]);

  // ── Init map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then(mod => {
      const L = mod.default;
      lRef.current = L;

      const defaultCenter: [number, number] = center
        ? [center.lat, center.lng]
        : [38.5, -96]; // continental US fallback

      const map = L.map(containerRef.current!, {
        center: defaultCenter,
        zoom: center ? zoom : 4,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Course flag
      if (center) {
        L.marker([center.lat, center.lng], {
          icon: L.divIcon({
            html: '<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">⛳</div>',
            className: '',
            iconSize: [28, 28],
            iconAnchor: [4, 28],
          }),
        }).addTo(map).bindPopup(`<strong>${center.label}</strong>`);
      }

      drawPins(L, map);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      lRef.current   = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update live pins whenever locations change ──────────────────────────
  useEffect(() => {
    if (!mapRef.current || !lRef.current) return;
    drawPins(lRef.current, mapRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveLocations, filterCourseId]);

  function drawPins(L: any, map: any) {
    pinRefs.current.forEach(m => m.remove());
    pinRefs.current = [];

    const visible = filterCourseId != null
      ? liveLocations.filter(p => p.course_id === filterCourseId)
      : liveLocations;

    const bounds: [number, number][] = [];

    visible.forEach((p, i) => {
      const color = COLORS[i % COLORS.length];
      const ini   = initials(p.player_name);
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          html: `<div style="
            width:34px;height:34px;border-radius:50%;
            background:${color};color:#fff;
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:700;
            border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);
          ">${ini}</div>`,
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        zIndexOffset: 1000,
      }).addTo(map).bindPopup(`<strong>${p.player_name}</strong>${p.course_id ? '' : ''}`);
      pinRefs.current.push(marker);
      bounds.push([p.lat, p.lng]);
    });

    // If no fixed center and we have pins, fit to them
    if (!center && bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative' }}
    />
  );
}
