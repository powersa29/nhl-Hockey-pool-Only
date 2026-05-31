import { ImageResponse } from 'next/og';

export async function GET() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #166534, #15803d)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '100px',
      fontSize: 320,
    }}>
      ⛳
    </div>,
    { width: 512, height: 512 },
  );
}
