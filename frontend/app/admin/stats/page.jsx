'use client';

// Bosh admin uchun statistika Boshqaruv panelining ikkinchi yorligʻiga koʻchirildi.
// Ustoz uchun esa bu alohida sahifa boʻlib qoladi — uning paneli yoʻq.

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import StudentAnalytics from '@/components/admin/StudentAnalytics';

export default function StatsPage() {
  const { isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAdmin) window.location.replace('/admin?tab=students');
  }, [loading, isAdmin]);

  if (loading || isAdmin) return <Spinner />;
  return <StudentAnalytics showHeading />;
}
