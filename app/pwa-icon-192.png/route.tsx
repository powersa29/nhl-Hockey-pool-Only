import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(145deg, #14532d 0%, #166534 60%, #15803d 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      borderRadius: '40px', gap: '6px',
    }}>
      <div style={{ display: 'flex', fontSize: 100 }}>🌭</div>
      <div style={{ display: 'flex', fontSize: 56 }}>⛳</div>
    </div>,
    { width: 192, height: 192 },
  );
}
