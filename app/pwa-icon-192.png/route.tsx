import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #166534, #15803d)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '40px',
      fontSize: 120,
    }}>
      ⛳
    </div>,
    { width: 192, height: 192 },
  );
}
