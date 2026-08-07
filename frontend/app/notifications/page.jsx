'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Shield, GraduationCap, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} kun oldin`;
  return new Date(dateStr).toLocaleDateString('uz-UZ');
}

function NotificationsInner() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/me/notifications')
      .then((res) => { setItems(res.notifications); setUnread(res.unread); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    // Optimistik yangilash
    setItems((prev) => prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await api.post(`/me/notifications/${id}/read`); }
    catch { load(); }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try { await api.post('/me/notifications/read-all'); }
    catch { load(); }
  };

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl">
            <Bell size={26} className="text-primary" /> Xabarlar
          </h1>
          <p className="mt-1 text-muted">
            {unread > 0 ? `${unread} ta o'qilmagan xabar` : 'Barcha xabarlar o\'qilgan'}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="btn-outline">
            <CheckCheck size={16} /> Hammasini o'qildi
          </button>
        )}
      </div>

      <div className="mt-6">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState title="Xabarlar yo'q" text="Sizga yuborilgan xabarlar shu yerda ko'rinadi" icon={Bell} />
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`card cursor-pointer p-5 transition-colors ${n.read ? '' : 'border-l-4 border-l-primary bg-indigo-50/30'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.sender?.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : n.sender?.role === 'INSTRUCTOR' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    {n.sender?.role === 'ADMIN' ? <Shield size={16} /> : n.sender?.role === 'INSTRUCTOR' ? <GraduationCap size={16} /> : <Bell size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{n.title}</h3>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink/90">{n.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                      <span>{n.sender?.fullName || 'Ustoz'}</span>
                      <span>·</span>
                      <span>{timeAgo(n.createdAt)}</span>
                      {n.emailSent && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Mail size={11} /> emailga ham yuborilgan</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsInner />
    </RequireAuth>
  );
}
