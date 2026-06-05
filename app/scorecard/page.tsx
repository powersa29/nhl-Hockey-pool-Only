'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScorecardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/live'); }, [router]);
  return null;
}
