'use client';

// Maosh boʻlimi rolga qarab ikki xil koʻrinadi:
//   ustoz      -> oʻz daromadi, tranzaksiyalari, oʻtkazmalari va promo kodlari
//   bosh admin -> barcha ustozlar boʻyicha jamlangan hisobot va boshqaruv
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import AdminEarnings from '@/components/admin/AdminEarnings';
import InstructorEarnings from '@/components/admin/InstructorEarnings';

export default function EarningsPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  return isAdmin ? <AdminEarnings /> : <InstructorEarnings />;
}
