import { Mail, Phone, MapPin, Send } from 'lucide-react';

export const metadata = { title: 'Bog\'lanish' };

export default function ContactPage() {
  const items = [
    { icon: Mail, label: 'Email', value: 'info@ustoz.uz' },
    { icon: Phone, label: 'Telefon', value: '+998 90 123 45 67' },
    { icon: MapPin, label: 'Manzil', value: 'Toshkent, O\'zbekiston' },
  ];

  return (
    <div className="container-page max-w-4xl py-14">
      <div className="text-center">
        <h1 className="text-4xl">Bog'lanish</h1>
        <p className="mt-3 text-muted">Savollaringiz bo'lsa, biz bilan bog'laning</p>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {/* Kontaktlar */}
        <div className="space-y-4">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="card flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-primary"><Icon size={20} /></span>
                <div>
                  <div className="text-sm text-muted">{it.label}</div>
                  <div className="font-medium">{it.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Forma (demo) */}
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
          <p className="mt-2 text-center text-xs text-muted">Demo forma — hozircha xabar yuborilmaydi</p>
        </form>
      </div>
    </div>
  );
}
