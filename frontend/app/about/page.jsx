import { GraduationCap, Target, Heart, Users } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

export const metadata = { title: 'Biz haqimizda' };

export default function AboutPage() {
  const values = [
    { icon: Target, title: 'Amaliy bilim', text: 'Har bir kurs real loyihalar va amaliy topshiriqlarga asoslangan.' },
    { icon: Heart, title: 'O\'zbek tilida', text: 'Barcha materiallar ona tilimizda, tushunarli va sifatli tayyorlangan.' },
    { icon: Users, title: 'Hamjamiyat', text: 'Tajribali murabbiylar va faol o\'quvchilar hamjamiyati.' },
  ];

  return (
    <div className="container-page max-w-4xl py-14">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white">
          <GraduationCap size={28} />
        </span>
        <h1 className="mt-5 text-4xl">Biz haqimizda</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          {SITE_NAME} — o'zbek yoshlarini zamonaviy IT kasblariga tayyorlaydigan onlayn ta'lim
          platformasi. Bizning maqsadimiz — sifatli ta'limni har bir insonga yetkazish.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {values.map((v) => {
          const Icon = v.icon;
          return (
            <div key={v.title} className="card p-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-primary">
                <Icon size={24} />
              </span>
              <h3 className="mt-4 text-lg">{v.title}</h3>
              <p className="mt-2 text-sm text-muted">{v.text}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl bg-gradient-to-r from-indigo-50 to-amber-50 p-8 text-center">
        <h2 className="text-2xl">Bizning missiyamiz</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Har bir o'zbekistonlik yoshga geografik joylashuvidan qat'i nazar, jahon darajasidagi
          IT ta'limni qulay narxda yetkazish va ularni raqamli kelajakka tayyorlash.
        </p>
      </div>
    </div>
  );
}
