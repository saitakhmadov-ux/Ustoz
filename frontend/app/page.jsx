import Link from 'next/link';
import {
  ArrowRight, Award, PlayCircle, Users, Globe, CheckCircle2,
  Code2, Server, Smartphone, Rocket, BarChart3, FileSpreadsheet,
} from 'lucide-react';
import TopCourses from '@/components/TopCourses';
import Reveal from '@/components/Reveal';
import TiltCard from '@/components/TiltCard';
import HeroVisual from '@/components/home/HeroVisual';
import StatsBand from '@/components/home/StatsBand';
import Testimonials from '@/components/home/Testimonials';

const categories = [
  { slug: 'office', name: 'Office dasturlari', icon: FileSpreadsheet, color: 'bg-blue-50 text-blue-600' },
  { slug: 'frontend', name: 'Frontend', icon: Code2, color: 'bg-violet-50 text-violet-600' },
  { slug: 'backend', name: 'Backend', icon: Server, color: 'bg-indigo-50 text-indigo-600' },
  { slug: 'mobile', name: 'Mobile', icon: Smartphone, color: 'bg-pink-50 text-pink-600' },
  { slug: 'devops', name: 'DevOps', icon: Rocket, color: 'bg-orange-50 text-orange-600' },
  { slug: 'data-science', name: 'Data Science', icon: BarChart3, color: 'bg-purple-50 text-purple-600' },
];

const features = [
  { icon: PlayCircle, title: 'Video darslar', text: 'Har bir mavzu bo\'yicha tushunarli video darslar va amaliy topshiriqlar.', tint: 'bg-indigo-50 text-primary' },
  { icon: Award, title: 'Sertifikat', text: 'Kursni to\'liq tugatganingizdan so\'ng rasmiy sertifikat oling.', tint: 'bg-emerald-50 text-accent' },
  { icon: Users, title: 'Tajribali murabbiylar', text: 'Sohaning yetuk mutaxassislaridan bilim oling.', tint: 'bg-indigo-50 text-primary' },
  { icon: Globe, title: 'O\'zbek tilida', text: 'Barcha kurslar to\'liq o\'zbek tilida, tushunarli va sifatli.', tint: 'bg-emerald-50 text-accent' },
];

// Bosh sahifa matnlari uchun zaxira (backend defaults bilan mos)
const CONTENT_DEFAULTS = {
  heroTitle: "Kelajak kasbini bugun o'rganing",
  heroSubtitle:
    "Frontend, Backend, Mobile va DevOps yo'nalishlarida amaliy kurslar — video darslar, testlar va sertifikat bilan mutaxassisga aylaning.",
  ctaTitle: 'Bilim — eng yaxshi sarmoya',
  ctaSubtitle:
    "Bugun ro'yxatdan o'ting va o'zingizga mos kursni tanlab, yangi kasbga yo'l oching.",
};

// Admin tahrirlagan matnlarni serverdan oladi (SSR, har renderда yangi).
async function getHomeContent() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/home/content`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content || null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const content = await getHomeContent();
  const c = { ...CONTENT_DEFAULTS, ...(content || {}) };

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        {/* Nozik indigo + emerald nurlar — zamonaviy SaaS chuqurligi */}
        <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" aria-hidden="true" />
        {/* Yengil nuqta-tur teksturasi */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'linear-gradient(to bottom, black, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="container-page relative grid items-start gap-12 py-12 md:grid-cols-[2fr_3fr] md:pb-24 md:pt-14">
          <div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              {c.heroTitle}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              {c.heroSubtitle}
            </p>

            {/* Afzalliklar */}
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {['Sertifikatli kurslar', 'Amaliy ko\'nikmalar', 'O\'zbek tilida'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-medium text-ink">
                  <CheckCircle2 size={17} className="text-accent" /> {t}
                </li>
              ))}
            </ul>

            {/* CTA — ikki tugma (Edura uslubi) */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-accent">
                Bepul boshlash <ArrowRight size={16} />
              </Link>
              <Link href="/courses" className="btn bg-ink text-white hover:opacity-90">
                Kurslar
              </Link>
            </div>
          </div>

          {/* Rasmli visual — surat + suzuvchi jonli kartalar */}
          <HeroVisual />
        </div>
      </section>

      {/* ===== Jonli statistika bandi (hero ostida suzadi) ===== */}
      <StatsBand />

      {/* ===== Kategoriyalar ===== */}
      <section className="container-page py-16 sm:py-20">
        <Reveal className="mb-10 text-center">
          <h2 className="text-3xl">Mashhur yo'nalishlar</h2>
          <p className="mt-2 text-muted">O'zingizga mos sohani tanlang va o'rganishni boshlang</p>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <Reveal key={cat.slug} delay={(i % 6) * 60}>
                <TiltCard className="h-full">
                <Link
                  href={`/categories/${cat.slug}`}
                  className="card group flex h-full flex-col items-center gap-3 p-6 text-center transition-[border-color,box-shadow] hover:border-indigo-200 hover:shadow-card-hover"
                >
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl ${cat.color}`}>
                    <Icon size={26} />
                  </span>
                  <span className="text-sm font-semibold">{cat.name}</span>
                </Link>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ===== Eng yuqori baholi kurslar ===== */}
      <TopCourses limit={4} />

      {/* ===== O'quvchilar fikri (real sharhlar) ===== */}
      <Testimonials limit={6} />

      {/* ===== Nega Ustoz ===== */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl">Nega aynan Ustoz?</h2>
            <p className="mt-2 text-muted">Sifatli ta'lim uchun kerakli hamma narsa bir joyda</p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={(i % 4) * 80}>
                  <div className="card h-full p-6 transition-all hover:border-indigo-200 hover:shadow-card-hover hover:-translate-y-0.5">
                    <span className={`grid h-12 w-12 place-items-center rounded-xl ${f.tint}`}>
                      <Icon size={24} />
                    </span>
                    <h3 className="mt-4 text-lg">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="container-page py-16 sm:py-20">
        <Reveal className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark px-8 py-14 text-center text-white md:py-20">
          <div>
            <h2 className="text-3xl text-white md:text-4xl">{c.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-indigo-50">
              {c.ctaSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-accent">
                Hoziroq boshlash <ArrowRight size={16} />
              </Link>
              <Link href="/courses" className="btn inline-flex items-center gap-2 border border-white/40 bg-white/10 text-white hover:bg-white/20">
                Kurslarni ko'rish
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-indigo-50">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> Bepul kurslar mavjud</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> Sertifikat bilan</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> O'zbek tilida</span>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
