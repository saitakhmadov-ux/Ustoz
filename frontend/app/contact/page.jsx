import { Clock, Send } from 'lucide-react';
import { contactIcon } from '@/lib/contactIcons';

export const metadata = { title: 'Kontaktlar' };

// Sahifa mazmuni to'liq admin panelidan boshqariladi
// (Admin -> Sayt sahifalari -> "Kontaktlar").
// Backend saqlanmagan maydonlar uchun standart qiymat qaytaradi.
async function getContact() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/home/contact`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.contact || null;
  } catch {
    return null;
  }
}

// Kartochka: havola bo'lsa bosiladigan, bo'lmasa oddiy blok
function ContactCard({ item }) {
  const Icon = contactIcon(item.icon);
  const inner = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-primary">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        {item.label && <div className="text-sm text-muted">{item.label}</div>}
        <div className="break-words font-medium">{item.value}</div>
      </div>
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target={item.url.startsWith('http') ? '_blank' : undefined}
        rel="noreferrer"
        className="card flex items-center gap-4 p-5 transition-colors hover:border-primary"
      >
        {inner}
      </a>
    );
  }
  return <div className="card flex items-center gap-4 p-5">{inner}</div>;
}

export default async function ContactPage() {
  const contact = await getContact();

  // Backend javob bermasa ham sahifa ochilishi kerak
  if (!contact) {
    return (
      <div className="container-page max-w-4xl py-14 text-center">
        <h1 className="text-4xl">Kontaktlar</h1>
        <p className="mt-4 text-muted">Ma'lumotni yuklab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.</p>
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-14">
      <div className="text-center">
        <h1 className="text-4xl">{contact.title}</h1>
        {contact.subtitle && <p className="mt-3 text-muted">{contact.subtitle}</p>}
      </div>

      <div className={`mt-10 grid gap-8 ${contact.formEnabled ? 'md:grid-cols-2' : ''}`}>
        {/* Aloqa ma'lumotlari */}
        <div className="space-y-4">
          {contact.items.map((it) => <ContactCard key={it.id} item={it} />)}

          {contact.workHours && (
            <div className="card flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-primary">
                <Clock size={20} />
              </span>
              <div>
                <div className="text-sm text-muted">Ish vaqti</div>
                <div className="whitespace-pre-line font-medium">{contact.workHours}</div>
              </div>
            </div>
          )}
        </div>

        {/* Forma (demo) — admin panelidan yoqib/o'chiriladi */}
        {contact.formEnabled && (
          <form className="card p-6">
            <div className="mb-4">
              <label className="label">Ismingiz</label>
              <input className="input" placeholder="Ism Familiya" />
            </div>
            <div className="mb-4">
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="siz@example.com" />
            </div>
            <div className="mb-5">
              <label className="label">Xabar</label>
              <textarea className="input min-h-[110px]" placeholder="Xabaringizni yozing..." />
            </div>
            <button type="button" className="btn-primary w-full">
              <Send size={16} /> Yuborish
            </button>
            {contact.formNote && (
              <p className="mt-2 text-center text-xs text-muted">{contact.formNote}</p>
            )}
          </form>
        )}
      </div>

      {/* Xarita */}
      {contact.mapUrl && (
        <div className="mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-line">
          <iframe
            src={contact.mapUrl}
            title="Xarita"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
