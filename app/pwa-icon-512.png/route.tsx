import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(145deg, #14532d 0%, #166534 60%, #15803d 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      borderRadius: '108px', gap: '16px',
    }}>
      <div style={{ display: 'flex', fontSize: 270 }}>🌭</div>
      <div style={{ display: 'flex', fontSize: 150 }}>⛳</div>
    </div>,
    { width: 512, height: 512 },
  );
}
