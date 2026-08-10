'use client';

// Maosh bo'limi rolga qarab ikki xil ko'rinadi:
//   ustoz      -> o'z daromadi, tranzaksiyalari, o'tkazmalari va promo kodlari
//   bosh admin -> barcha ustozlar bo'yicha jamlangan hisobot va boshqaruv
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
import AdminEarnings from '@/components/admin/AdminEarnings';
import InstructorEarnings from '@/components/admin/InstructorEarnings';

export default function EarningsPage() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  return isAdmin ? <AdminEarnings /> : <InstructorEarnings />;
}
