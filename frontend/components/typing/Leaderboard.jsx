'use client';

// "Rekordlar" — eng kuchli natijalar jadvali.
//
// Kurs darslari va erkin mashq natijalari birga hisoblanadi. Jadvalga faqat
// yetarli uzun urinishlar kiradi (server tekshiradi), aks holda qisqa mashqda
// chiqqan sun'iy yuqori tezlik ro'yxatni buzardi.

import { useEffect, useState } from 'react';
import {
  Trophy, Medal, Zap, Keyboard, RefreshCw, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ErrorState } from '@/components/ui';

// Birinchi uchtasiga alohida rang
const PODIUM = {
  1: 'bg-amber-100 text-amber-700',
  2: 'bg-slate-200 text-slate-600',
  3: 'bg-orange-100 text-orange-700',
};

function Rank({ n }) {
  const tone = PODIUM[n];
  return (
    <span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${tone || 'text-muted'}`}>
      {n <= 3 ? <Medal size={16} /> : n}
    </span>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/typing/leaderboard')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorState message={error} />;
  if (loading && !data) {
    return <div className="card grid place-items-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const rows = data?.rows || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <Trophy size={20} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Eng kuchli natijalar</h2>
            <p className="text-sm text-muted">
              Darslar va erkin mashq bo'yicha eng tez yozgan {rows.length} ta foydalanuvchi
            </p>
          </div>
        </div>
        <button type="button" onClick={load} disabled={loading} className="btn-ghost text-sm">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Yangilash
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium text-ink">Hali rekord yo'q</p>
          <p className="mt-1 text-sm text-muted">
            Jadvalga tushish uchun kamida {data?.minSec || 15} soniya davom etadigan
            mashqni yakunlang — masalan erkin mashqdagi 30 soniyalik test.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 w-16">O'rin</th>
                  <th className="px-4 py-3">Foydalanuvchi</th>
                  <th className="px-4 py-3">Tezlik</th>
                  <th className="px-4 py-3">Aniqlik</th>
                  <th className="px-4 py-3">Manba</th>
                  <th className="px-4 py-3 text-right">Urinishlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.userId} className={r.isMe ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3"><Rank n={r.rank} /></td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{r.fullName}</span>
                      {r.isMe && <span className="ml-2 badge bg-primary text-white">Siz</span>}
                    </td>
                    <td className="px-4 py-3">
                      <b className="font-display text-lg text-ink">{r.wpm}</b>
                      <span className="ml-1 text-xs text-muted">so'z/daq</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{r.accuracy != null ? `${r.accuracy}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        {r.source === 'lesson'
                          ? <><Keyboard size={13} /> Dars</>
                          : <><Zap size={13} /> Erkin mashq</>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{r.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ro'yxatga kirmagan bo'lsangiz ham o'z o'rningiz ko'rinadi */}
      {data?.me && !data.me.inTop && (
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
          <span className="text-sm text-muted">Sizning o'rningiz:</span>
          <span className="font-display text-lg text-ink">{data.me.rank}-o'rin</span>
          <span className="text-sm text-muted">{data.me.wpm} so'z/daqiqa</span>
          <span className="text-sm text-muted">{data.me.attempts} ta urinish</span>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Jadvalga faqat kamida {data?.minChars || 100} belgi va {data?.minSec || 15} soniyadan
        uzun mashqlar kiradi — qisqa mashqda tezlik haqiqiy ko'rsatkichni bermaydi.
        Ro'yxat har safar ochilganda qaytadan hisoblanadi.
      </p>
    </div>
  );
}
