import Link from 'next/link';
import { Users, BarChart, Keyboard } from 'lucide-react';
import { LEVELS, formatPrice } from '@/lib/constants';
import { RatingBadge } from '@/components/Stars';
import TiltCard from '@/components/TiltCard';
import CourseCover from '@/components/CourseCover';

const levelColors = {
  BEGINNER: 'bg-indigo-50 text-indigo-700',
  INTERMEDIATE: 'bg-amber-50 text-amber-700',
  ADVANCED: 'bg-rose-50 text-rose-700',
};

export default function CourseCard({ course }) {
  const enrollCount = course._count?.enrollments ?? course.enrollments ?? 0;

  return (
    <TiltCard className="h-full">
    <Link
      href={`/courses/${course.slug}`}
      className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-card-hover"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt={course.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <CourseCover
            title={course.title}
            slug={course.slug}
            className="transition-transform group-hover:scale-105"
          />
        )}
        <span className={`badge absolute left-3 top-3 ${levelColors[course.level] || levelColors.BEGINNER}`}>
          <BarChart size={12} /> {LEVELS[course.level] || course.level}
        </span>
        {course.kind === 'TYPING' && (
          <span className="badge absolute right-3 top-3 bg-chip text-on-chip">
            <Keyboard size={12} /> Klaviatura mashqi
          </span>
        )}
      </div>

      {/* Kontent */}
      <div className="flex flex-1 flex-col p-4">
        {course.category?.name && (
          <span className="text-xs font-medium text-primary">{course.category.name}</span>
        )}
        <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold leading-snug">
          {course.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{course.authorName}</p>

        {/* Reyting */}
        {course.rating && (
          <div className="mt-2">
            <RatingBadge average={course.rating.average} count={course.rating.count} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users size={14} /> {enrollCount} oʻquvchi
          </span>
          <span className={`font-display font-bold ${course.isFree ? 'text-primary' : 'text-ink'}`}>
            {formatPrice(course.price, course.isFree)}
          </span>
        </div>
      </div>
    </Link>
    </TiltCard>
  );
}
