import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="font-display text-7xl font-bold text-primary">404</div>
      <h1 className="mt-4 text-2xl">Sahifa topilmadi</h1>
      <p className="mt-2 max-w-md text-muted">
        Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki koʻchirilgan boʻlishi mumkin.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary"><Home size={16} /> Bosh sahifa</Link>
        <Link href="/courses" className="btn-outline"><Search size={16} /> Kurslar</Link>
      </div>
    </div>
  );
}
