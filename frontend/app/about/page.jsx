import { GraduationCap } from 'lucide-react';
import { fileUrl } from '@/lib/constants';
import { videoEmbed } from '@/lib/video';
import { aboutIcon } from '@/lib/aboutIcons';

export const metadata = { title: 'Biz haqimizda' };

// Sahifa mazmuni toʻliq admin panelidan boshqariladi
// (Admin -> Bosh sahifa -> "Biz haqimizda").
// Backend saqlanmagan maydonlar uchun standart qiymat qaytaradi.
async function getAbout() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/home/about`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.about || null;
  } catch {
    return null;
  }
}

// Matndagi boʻsh qatorlarni alohida abzatsga ajratamiz
function Paragraphs({ text, className = '' }) {
  const parts = String(text || '').split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
  return parts.map((p, i) => (
    <p key={i} className={`${className} ${i > 0 ? 'mt-3' : ''}`}>{p}</p>
  ));
}

export default async function AboutPage() {
  const about = await getAbout();

  // Backend javob bermasa ham sahifa ochilishi kerak
  if (!about) {
    return (
      <div className="container-page max-w-4xl py-14 text-center">
        <h1 className="text-4xl">Biz haqimizda</h1>
        <p className="mt-4 text-muted">Maʼlumotni yuklab boʻlmadi. Birozdan soʻng qayta urinib koʻring.</p>
      </div>
    );
  }

  const video = videoEmbed(about.video?.url);
  const hasMission = about.mission?.title || about.mission?.text;

  return (
    <div className="container-page max-w-4xl py-14">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-on-primary">
          <GraduationCap size={28} />
        </span>
        <h1 className="mt-5 text-4xl">{about.title}</h1>
        <div className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          <Paragraphs text={about.subtitle} />
        </div>
      </div>

      {/* Video */}
      {video.kind !== 'none' && (
        <div className="mt-12">
          {about.video.title && <h2 className="mb-4 text-center text-2xl">{about.video.title}</h2>}
          <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-black shadow-sm">
            {video.kind === 'embed' ? (
              <iframe
                src={video.src}
                title={about.video.title || 'Video'}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={fileUrl(video.src)} controls className="h-full w-full" />
            )}
          </div>
          {about.video.caption && (
            <p className="mt-3 text-center text-sm text-muted">{about.video.caption}</p>
          )}
        </div>
      )}

      {/* Kartochkalar */}
      {about.values.length > 0 && (
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {about.values.map((v) => {
            const Icon = aboutIcon(v.icon);
            return (
              <div key={v.id} className="card p-6 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-primary">
                  <Icon size={24} />
                </span>
                {v.title && <h3 className="mt-4 text-lg">{v.title}</h3>}
                {v.text && <p className="mt-2 text-sm text-muted">{v.text}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Qoʻshimcha boʻlimlar */}
      {about.sections.length > 0 && (
        <div className="mt-12 space-y-8">
          {about.sections.map((s) => (
            <section key={s.id} className="card overflow-hidden">
              {s.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl(s.image)} alt={s.title || ''} className="h-56 w-full object-cover sm:h-72" />
              )}
              <div className="p-6">
                {s.title && <h2 className="text-2xl">{s.title}</h2>}
                {s.text && (
                  <div className={s.title ? 'mt-3' : ''}>
                    <Paragraphs text={s.text} className="text-muted" />
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Missiya */}
      {hasMission && (
        <div className="mt-12 rounded-2xl bg-gradient-to-r from-indigo-50 to-amber-50 p-8 text-center">
          {about.mission.title && <h2 className="text-2xl">{about.mission.title}</h2>}
          {about.mission.text && (
            <div className="mx-auto mt-3 max-w-2xl">
              <Paragraphs text={about.mission.text} className="text-muted" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
