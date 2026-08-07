# Ustoz — Internetga joylash (Deploy) qo'llanmasi

Ushbu qo'llanma Ustoz platformasini jonli havolaga chiqaradi:

| Qism | Xizmat | Bepulmi |
|------|--------|---------|
| Frontend (Next.js) | **Vercel** | ✅ Ha |
| Backend (Express API) | **Railway** | ⚠️ Trial ($5 kredit), keyin karta |
| Ma'lumotlar bazasi (PostgreSQL) | **Railway** | ⚠️ Trial ichida |

> **Muqobil (to'liq bepul):** backend uchun Railway o'rniga **Render** + baza uchun **Neon** ishlatish mumkin. Quyida asosiy yo'l — Railway.

Kod allaqachon deploy uchun tayyorlandi:
- `backend/railway.json` — Railway build/start sozlamasi (avtomatik `prisma migrate deploy`)
- `backend/.env.example`, `frontend/.env.example` — kerakli o'zgaruvchilar
- CORS bir nechta domenni qo'llab-quvvatlaydi (`CLIENT_URL` vergul bilan)
- `postinstall` da `prisma generate`

---

## 1-qadam — GitHub'ga yuklash

Railway va Vercel kodni GitHub'dan oladi (GitHub havolasi awards.gov.uz shaklida ham majburiy).

```bash
cd "C:\claude cod"
git init
git add .
git commit -m "Ustoz platformasi — deploy uchun tayyor"
```

Keyin GitHub'da **yangi bo'sh repo** yarating (github.com/new, masalan `ustoz`), va:

```bash
git remote add origin https://github.com/FOYDALANUVCHI/ustoz.git
git branch -M main
git push -u origin main
```

> GitHub parol o'rniga **Personal Access Token** so'raydi yoki `gh auth login` ishlating.

---

## 2-qadam — Railway: PostgreSQL + Backend

1. [railway.app](https://railway.app) ga GitHub bilan kiring.
2. **New Project → Deploy from GitHub repo →** `ustoz` reposini tanlang.
3. Railway monorepo — backend papkasini ko'rsating:
   - Service → **Settings → Root Directory** = `backend`
4. **New → Database → Add PostgreSQL** (loyihaga Postgres qo'shiladi).
5. Backend service → **Variables** bo'limiga o'zgaruvchilarni kiriting:

   | Kalit | Qiymat |
   |-------|--------|
   | `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` |
   | `JWT_SECRET` | *(kuchli tasodifiy — pastda buyruq)* |
   | `CLIENT_URL` | *(hozircha bo'sh qoldiring — 4-qadamdan keyin)* |
   | `NODE_ENV` | `production` |
   | `ADMIN_EMAIL` | `admin@ustoz.uz` |
   | `ADMIN_PASSWORD` | *(o'zingiz kuchliroq qo'ying)* |
   | `PAYMENT_MOCK` | `true` |
   | `EMAIL_MOCK` | `true` |

   Kuchli `JWT_SECRET` yaratish:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

6. Backend service → **Settings → Networking → Generate Domain** (masalan `ustoz-backend.up.railway.app`).
7. Deploy avtomatik ishlaydi. Loglarda `🚀 Ustoz API ishga tushdi` ko'rinishi kerak (`prisma migrate deploy` migratsiyalarni qo'llaydi).

Tekshirish: `https://SIZNING-BACKEND.up.railway.app/api/health` yoki `/api/courses` ochib ko'ring.

---

## 3-qadam — Boshlang'ich ma'lumot (seed)

Kurslar, kategoriyalar va admin foydalanuvchi yaratish uchun **bir marta** seed ishga tushiring.

Railway backend service → **⋮ → Run a command** (yoki Railway CLI):
```bash
npm run db:seed
```

Bu quyidagilarni yaratadi:
- Admin: `admin@ustoz.uz` / `admin12345` (yoki siz belgilagan parol)
- 6 kategoriya + 6 kurs (bo'lim/dars/test bilan)

---

## 4-qadam — Vercel: Frontend

1. [vercel.com](https://vercel.com) ga GitHub bilan kiring.
2. **Add New → Project →** `ustoz` reposini import qiling.
3. **Root Directory** = `frontend` tanlang (Edit tugmasi orqali).
4. **Environment Variables** qo'shing:

   | Kalit | Qiymat |
   |-------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://SIZNING-BACKEND.up.railway.app/api` |

   > Oxiridagi `/api` ni **albatta** qo'shing.
5. **Deploy** bosing. Tugagach `https://ustoz.vercel.app` kabi havola beriladi.

---

## 5-qadam — CORS ni ulash (MUHIM)

Endi Vercel domenini backendga ruxsat bering:

1. Railway backend → **Variables → `CLIENT_URL`** =
   ```
   https://ustoz.vercel.app
   ```
   (o'zingizning Vercel domeningiz; bir nechta bo'lsa vergul bilan)
2. Backend qayta deploy bo'ladi.

Endi sayt to'liq ishlaydi. 🎉

---

## Tekshirish ro'yxati

- [ ] `.../api/courses` JSON qaytaradi (backend ishlaydi)
- [ ] Vercel sayti ochiladi, kurslar ko'rinadi
- [ ] `admin@ustoz.uz` bilan `/login` → `/admin` ishlaydi
- [ ] Ro'yxatdan o'tish, kursga yozilish ishlaydi

---

## Muhim eslatmalar

### ⚠️ Yuklangan fayllar (uploads) vaqtinchalik
Backend yuklangan rasm/video/PDF fayllarni `backend/uploads/` diskiga saqlaydi. Railway'da **har redeploy'da bu papka tozalanadi** — admin yuklagan fayllar yo'qoladi. Seed kontenti tashqi (YouTube/Unsplash) havolalar bo'lgani uchun saqlanadi.

**Yechim (ixtiyoriy):** Railway backend service → **Settings → Volumes → Add Volume**, mount path = `/app/uploads`. Shunda yuklangan fayllar saqlanadi.

Uzoq muddat uchun: Cloudinary yoki S3 kabi obyekt-saqlash ishlatiladi (kelgusi ish).

### 💳 Xarajat
Railway yangi hisoblar uchun ~$5 trial kredit beradi; keyin karta talab qilinishi mumkin. Vercel frontend bepul. Agar butunlay bepul kerak bo'lsa: **Neon** (baza) + **Render** (backend) + **Vercel** (frontend).

### 🔒 Xavfsizlik
- `JWT_SECRET` ni albatta kuchli qiling.
- Deploy'dan keyin `ADMIN_PASSWORD` ni o'zgartiring.
- `.env` fayllar hech qachon GitHub'ga tushmaydi (`.gitignore` da).

---

## Muqobil: to'liq bepul (Neon + Render)

Agar Railway kartasiz kerak bo'lmasa:
1. **Neon** (neon.tech) → yangi Postgres → `DATABASE_URL` oling.
2. **Render** (render.com) → New Web Service → GitHub repo → Root `backend`, Build `npm install`, Start `npm run start:prod`, `DATABASE_URL` va boshqa o'zgaruvchilarni kiriting.
3. Frontend — o'sha Vercel qadamlari.
