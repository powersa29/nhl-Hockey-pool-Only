import { ImageResponse } from 'next/og';

export const size        = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(145deg, #14532d 0%, #166534 60%, #15803d 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      borderRadius: '38px', gap: '4px',
    }}>
      <div style={{ display: 'flex', fontSize: 96 }}>🌭</div>
      <div style={{ display: 'flex', fontSize: 52 }}>⛳</div>
    </div>,
    { ...size },
  );
}
