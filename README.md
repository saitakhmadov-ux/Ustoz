# Ustoz — Onlayn IT ta'lim platformasi

O'zbek tilidagi Coursera uslubidagi onlayn IT ta'lim platformasi. Foydalanuvchilar kurslarga yoziladi, video darslarni ko'radi, testlar yechadi, progressni saqlaydi va kursni tugatgach sertifikat oladi. Admin kurslar, darslar va kategoriyalarni boshqaradi.

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, lucide-react |
| Backend | Node.js + Express |
| Ma'lumotlar bazasi | PostgreSQL |
| ORM | Prisma |
| Autentifikatsiya | JWT (bcrypt bilan parol hash) |

## Loyiha strukturasi

```
ustoz/
├── backend/                 # Express API
│   ├── prisma/
│   │   ├── schema.prisma     # Ma'lumotlar bazasi sxemasi
│   │   └── seed.js           # Boshlang'ich ma'lumotlar (admin + kategoriyalar)
│   ├── src/
│   │   ├── config/           # env va prisma sozlamalari
│   │   ├── middleware/       # auth, xatolik ishlovchilar
│   │   ├── routes/           # API yo'nalishlari
│   │   ├── controllers/      # biznes mantiq
│   │   ├── utils/            # yordamchi funksiyalar (jwt, xatolik)
│   │   ├── app.js            # Express ilova sozlamasi
│   │   └── index.js          # Server kirish nuqtasi
│   └── .env.example
├── frontend/                # Next.js ilova
│   ├── app/                  # sahifalar (App Router)
│   ├── components/           # UI komponentlar
│   ├── lib/                  # API mijozi, konstantalar
│   └── .env.example
├── assets/inspiration/      # Dizayn referens rasmlar
└── README.md
```

## O'rnatish (birinchi marta)

### 0. Talab qilinadigan dasturlar

Quyidagilar kompyuteringizda o'rnatilgan bo'lishi kerak:

- **Node.js 18+** — https://nodejs.org (LTS versiyasini yuklab oling)
- **PostgreSQL 14+** — https://www.postgresql.org/download/windows/
  (yoki Docker orqali — pastga qarang)

O'rnatilganini tekshirish:
```bash
node --version
npm --version
psql --version
```

### 1. PostgreSQL bazasini tayyorlash

**Variant A — mahalliy PostgreSQL:**
psql yoki pgAdmin orqali baza yarating:
```sql
CREATE DATABASE ustoz;
```

**Variant B — Docker orqali (agar Docker bo'lsa):**
```bash
docker run --name ustoz-db -e POSTGRES_PASSWORD=parol -e POSTGRES_DB=ustoz -p 5432:5432 -d postgres:16
```

### 2. Backendni sozlash

```bash
cd backend
npm install
cp .env.example .env
```

`.env` faylini oching va `DATABASE_URL` ni o'z parolingizga moslang:
```
DATABASE_URL="postgresql://postgres:parol@localhost:5432/ustoz?schema=public"
```

Bazani migratsiya qilish va boshlang'ich ma'lumotlarni yuklash:
```bash
npm run prisma:generate     # Prisma mijozini yaratish
npm run prisma:migrate       # Jadvallarni yaratish (nom so'raladi, masalan: init)
npm run db:seed              # Admin va kategoriyalar
```

Serverni ishga tushirish:
```bash
npm run dev                  # http://localhost:5000
```

Tekshirish: brauzerda `http://localhost:5000/api/health` ochilsin.

### 3. Frontendni sozlash

Yangi terminalda:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

## Kirish ma'lumotlari (seed'dan keyin)

**Admin** (`.env` dagi qiymatlardan, standart):
- Email: `admin@ustoz.uz`
- Parol: `admin12345`

**Demo foydalanuvchi:**
- Email: `demo@ustoz.uz`
- Parol: `demo12345`

Seed 6 ta kategoriya va 6 ta namunaviy kurs (bepul + pullik, bo'lim/dars/testlar bilan) yaratadi.

> ⚠️ Ishlab chiqarishga chiqarishdan oldin admin parolini albatta o'zgartiring.

## Foydali buyruqlar (backend)

| Buyruq | Vazifasi |
|--------|----------|
| `npm run dev` | Serverni ishga tushirish (nodemon) |
| `npm run prisma:studio` | Ma'lumotlar bazasini vizual ko'rish |
| `npm run prisma:migrate` | Yangi migratsiya yaratish |
| `npm run db:seed` | Boshlang'ich ma'lumotlarni qayta yuklash |

## Foydalanuvchi rollari

1. **Admin** — kurs/dars/kategoriya CRUD, foydalanuvchilar va sotuvlar statistikasi.
2. **Ro'yxatdan o'tgan foydalanuvchi** — kurslarga yozilish, darslarni ko'rish, progress, sertifikat.
3. **Mehmon** — bepul kurslar va saytni ko'zdan kechirish.

## API yo'nalishlari (asosiy)

| Metod | Yo'nalish | Tavsif | Kirish |
|-------|-----------|--------|--------|
| POST | `/api/auth/register` | Ro'yxatdan o'tish | Ochiq |
| POST | `/api/auth/login` | Kirish | Ochiq |
| GET | `/api/auth/me` | Joriy foydalanuvchi | Token |
| GET | `/api/categories` | Kategoriyalar | Ochiq |
| GET | `/api/courses` | Kurslar (filtr bilan) | Ochiq |
| GET | `/api/courses/:slug` | Kurs tafsiloti | Ochiq |
| POST | `/api/enrollments` | Bepul kursga yozilish | Token |
| GET | `/api/enrollments/my` | Mening kurslarim | Token |
| GET | `/api/learn/:slug` | Kurs kontenti | Token + yozilgan |
| POST | `/api/lessons/:id/complete` | Darsni tugatish | Token |
| POST | `/api/lessons/:id/quiz` | Test topshirish | Token |
| POST | `/api/payments` | To'lov (Click/Payme mock) | Token |
| GET | `/api/payments/:id` | Chek | Token |
| GET | `/api/me/certificates` | Sertifikatlarim | Token |
| PUT | `/api/me` | Profil tahrirlash | Token |
| GET | `/api/admin/stats` | Statistika | Admin |
| POST | `/api/courses` | Kurs yaratish | Admin |
| POST | `/api/admin/sections` | Bo'lim qo'shish | Admin |
| POST | `/api/admin/lessons` | Dars qo'shish | Admin |
| POST | `/api/admin/questions` | Test savoli qo'shish | Admin |

## Asosiy sahifalar (frontend)

| Manzil | Sahifa |
|--------|--------|
| `/` | Bosh sahifa |
| `/courses` | Kurslar (filtrli) |
| `/courses/[slug]` | Kurs tafsiloti |
| `/categories`, `/categories/[slug]` | Kategoriyalar |
| `/login`, `/register` | Autentifikatsiya |
| `/dashboard` | Shaxsiy kabinet |
| `/learn/[slug]` | Dars ko'ruvchi (video + test) |
| `/checkout/[slug]`, `/receipt/[id]` | To'lov va chek |
| `/certificates`, `/certificates/[id]` | Sertifikatlar |
| `/profile` | Profil sozlamalari |
| `/admin/*` | Admin panel |

## Ishlanish holati (bosqichlar) — ✅ Yakunlandi

- [x] **1-bosqich** — Loyiha strukturasi, DB sxemasi, backend/frontend poydevori
- [x] **2-bosqich** — Autentifikatsiya (register/login/JWT)
- [x] **3-bosqich** — Kategoriya va kurslar tizimi
- [x] **4-bosqich** — Yozilish, darslar, progress
- [x] **5-bosqich** — To'lov (Click/Payme mock) + chek
- [x] **6-bosqich** — Foydalanuvchi paneli + sertifikat
- [x] **7-bosqich** — Admin panel
- [x] **8-bosqich** — Seed ma'lumot, statik sahifalar, hujjatlar

## Sozlamalar admin panelida

Quyidagilar bazadan (`SiteSetting`) boshqariladi — o'zgartirish uchun qayta
deploy qilish shart emas:

| Bo'lim | Nima boshqariladi |
|--------|-------------------|
| **Ustoz AI** | Gemini API kaliti, model, yo'naltiruvchi ko'rsatmalar |
| **Bosh sahifa** | Hero rasmlari, matnlar, "Biz haqimizda" sahifasi |
| **Aloqa va himoya** → Email (SMTP) | Jo'natuvchi, SMTP server/port/SSL, login-parol, mock rejim, sinov xati |
| **Aloqa va himoya** → Telegram bot | Bot tokeni, yoqish/o'chirish, sinov xabari, ulangan hisoblar soni |
| **Aloqa va himoya** → CAPTCHA | Cloudflare Turnstile ommaviy va maxfiy kalitlari |

Qoida: paneldagi qiymat `.env` dan ustun turadi. Email uchun panelda SMTP
serveri ko'rsatilsa, butun SMTP bloki (port, login, parol) ham paneldan olinadi;
maydon bo'sh qoldirilsa `.env` qiymatlariga qaytadi. Parol/maxfiy kalitlar
panelga niqoblangan holda qaytariladi va bo'sh yuborilsa o'zgarmaydi.

> Sinov xati mock rejimni chetlab o'tadi — "Haqiqiy xat yuborish" ni yoqishdan
> oldin sozlamani tekshirib olish mumkin. Terminaldan: `npm run mail:test [email]`

## Telegram bot

O'quvchi va ustozlar ma'lumotlarini Telegram orqali ham oladi.

**Sozlash:** @BotFather → `/newbot` → tokenni admin panelga (`Aloqa va himoya` →
`Telegram bot`) qo'ying. Saqlagach bot darhol ishga tushadi — serverni qayta
yuklash shart emas.

**Ulanish:** foydalanuvchi saytda Profil → "Telegram'ga ulash" tugmasini bosadi.
Bir martalik havola (`t.me/<bot>?start=<token>`, 15 daqiqa) botni ochadi va hisob
bog'lanadi. Token bazada ochiq saqlanmaydi (sha256), bir marta ishlatiladi va
bitta Telegram akkaunt faqat bitta hisobga ulanadi.

**Buyruqlar:** `/kurslarim` (progress va muddat bilan), `/yordam`, `/uzish`.

**Avtomatik xabarlar** (hisobini ulaganlarga Telegram'ga ham boradi; hammasi
sayt bildirishnomasi sifatida ham saqlanadi):

| Hodisa | Kim oladi |
|--------|-----------|
| Kursga yozilish (bepul, admin qo'shgan) | O'quvchi |
| To'lov qabul qilindi | O'quvchi |
| Kurs tugatildi — sertifikat tayyor | O'quvchi |
| Kirish muddati 3 kundan keyin tugaydi | O'quvchi (bir marta) |
| Kursiga yangi o'quvchi yozildi | Ustoz |
| Kursiga yangi sharh qoldirildi | Ustoz |

Admin `Xabarlar` bo'limida qo'lda yuborganda "Telegram botga ham yuborilsin"
belgisi bor. Avtomatik xabarlar **email yubormaydi** — Telegram bepul, email esa
kunlik chegarali; email faqat admin qo'lda tanlaganda ketadi.

Muddat ogohlantirishi serverning o'zida (12 soatda bir) tekshiriladi — alohida
cron xizmati kerak emas. Har yozilish uchun bir marta yuboriladi va muddat
yangilanganda belgi qayta tiklanadi.

**Rejim:** ommaviy manzil bo'lsa (Railway — `RAILWAY_PUBLIC_DOMAIN` avtomatik)
webhook, lokalda polling. Webhook so'rovlari maxfiy sarlavha bilan tekshiriladi.

## Rejadagi ishlar

- [ ] **Domenli pochta** — hozir xatlar shaxsiy Gmail'dan ketadi (kuniga ~500 ta
      chegara, jo'natuvchi sifatida shaxsiy manzil ko'rinadi). Domen olingach
      `no-reply@ustoz.uz` ga o'tish: [EMAIL-DOMEN-QOLLANMA.md](EMAIL-DOMEN-QOLLANMA.md)
      (kod o'zgarmaydi — yangi SMTP ma'lumotlari admin paneliga kiritiladi)
- [ ] **Turnstile kalitlari** — CAPTCHA kodi tayyor, Cloudflare'dan kalit olib
      admin panelga qo'yish qoldi
- [ ] **Jonli saytda emailni yoqish** — Railway'da hali mock rejim; admin panel
      → "Aloqa va himoya" bo'limidan SMTP to'ldirilib yoqiladi
- [ ] **Telegram bot — 3-bosqich** — AI Ustoz bot ichida, ustoz uchun
      `/maosh` va `/oquvchilarim` buyruqlari

## Litsenziya

Shaxsiy loyiha.
