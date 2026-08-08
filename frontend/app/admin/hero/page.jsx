'use client';

// Eski "Bosh sahifa rasmi" sahifasi "Bosh sahifa sozlamalari" (/admin/home) ga birlashtirildi.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectHero() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/home'); }, [router]);
  return null;
}
