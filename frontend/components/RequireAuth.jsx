'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Spinner } from './ui';

// Himoyalangan sahifalarni oʻraydi.
// adminOnly=true — faqat bosh admin. staffOnly=true — bosh admin yoki ustoz admin.
export default function RequireAuth({ children, adminOnly = false, staffOnly = false }) {
  const { isAuthenticated, isAdmin, isStaff, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const denied =
    (adminOnly && !isAdmin) || (staffOnly && !isStaff);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (denied) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, denied, router, pathname]);

  if (loading || !isAuthenticated || denied) {
    return <Spinner label="Tekshirilmoqda..." />;
  }
  return children;
}
