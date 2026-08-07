'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CourseForm from '@/components/admin/CourseForm';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';

export default function NewCoursePage() {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();

  // Kurs yaratish faqat bosh admin uchun
  useEffect(() => {
    if (!loading && !isAdmin) router.replace('/admin/courses');
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) return <Spinner />;

  return (
    <div>
      <Link href="/admin/courses" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} /> Kurslar
      </Link>
      <h1 className="text-2xl">Yangi kurs</h1>
      <p className="mt-1 text-sm text-muted">Kurs yaratgach, unga bo'lim va darslar qo'shasiz</p>
      <div className="mt-6 max-w-3xl">
        <CourseForm onSaved={(course) => router.push(`/admin/courses/${course.id}/curriculum`)} />
      </div>
    </div>
  );
}
