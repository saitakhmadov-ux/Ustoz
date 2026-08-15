'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ListTree } from 'lucide-react';
import { api } from '@/lib/api';
import CourseForm from '@/components/admin/CourseForm';
import { Spinner, ErrorState } from '@/components/ui';

export default function EditCoursePage() {
  const { id } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api.get(`/admin/courses/${id}/curriculum`)
      .then((res) => setCourse(res.course))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <Link href="/admin/courses" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} /> Kurslar
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Kursni tahrirlash</h1>
        <Link href={`/admin/courses/${id}/curriculum`} className="btn-outline"><ListTree size={16} /> Darslarni boshqarish</Link>
      </div>

      {/* Serverdan kelgan xabar: muddat nechta o'quvchiga qo'llangani ham shunda */}
      {saved && <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">{saved}</div>}

      <div className="mt-6 max-w-3xl">
        <CourseForm
          initial={course}
          onSaved={(c, message) => {
            setSaved(message || 'Saqlandi ✓');
            setTimeout(() => setSaved(''), 6000);
          }}
        />
      </div>
    </div>
  );
}
