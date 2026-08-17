'use client';

// Boshqaruv paneli — ikki yorliq bitta sahifada.
// Avval "Boshqaruv paneli" va "Statistika" alohida sahifa edi va ikkalasi ham
// daromad, sotuv, yozilish va kurs reytingini qayta-qayta koʻrsatardi.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import { PageHeader, SegmentedTabs } from '@/components/admin/table';
import DashboardOverview from '@/components/admin/DashboardOverview';
import StudentAnalytics from '@/components/admin/StudentAnalytics';

const TABS = [
  { key: 'overview', label: "Umumiy koʻrsatkichlar" },
  { key: 'students', label: "Oʻquvchilar tahlili" },
];

export default function AdminDashboardPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('overview');

  // Ustoz bu sahifaga huquqsiz — oʻz kurslariga yoʻnaltiramiz
  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/admin/courses');
  }, [authLoading, isAdmin, router]);

  // Yorliq manzil qatorida saqlanadi — havolani ulashsa boʻladi
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((x) => x.key === t)) setTab(t);
  }, []);

  const changeTab = useCallback((key) => {
    setTab(key);
    const qs = key === 'overview' ? '' : `?tab=${key}`;
    window.history.replaceState(null, '', window.location.pathname + qs);
  }, []);

  if (!isAdmin) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Boshqaruv paneli"
        subtitle={tab === 'overview'
          ? 'Platforma koʻrsatkichlari va dinamikasi'
          : 'Yozilishdan sertifikatgacha — oʻquvchilar kesimi'}
      >
        <SegmentedTabs value={tab} onChange={changeTab} items={TABS} />
      </PageHeader>

      <div className="mt-6">
        {tab === 'overview'
          ? <DashboardOverview onOpenAnalytics={() => changeTab('students')} />
          : <StudentAnalytics />}
      </div>
    </div>
  );
}
