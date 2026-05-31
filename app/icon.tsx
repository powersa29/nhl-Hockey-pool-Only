import { ImageResponse } from 'next/og';

export const size        = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(135deg, #166534, #15803d)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '6px',
      fontSize: 20,
    }}>
      ⛳
    </div>,
    { ...size },
  );
}
