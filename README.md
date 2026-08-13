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

**Ulanishning ikki yo'li bor. Ikkalasida ham bitta Telegram akkaunt faqat bitta
hisobga ulanadi va bot hech qachon parol so'ramaydi.**

**1) Botning o'zidan (Telegram Mini App).** Foydalanuvchi Telegram'da botni topadi
→ `/start` → "Siz kimsiz?" (o'quvchi/ustoz) → **"Hisobni ulash"** tugmasi →
Telegram ichida saytning `/telegram-link` sahifasi ochiladi → odam **saytning o'z
formasida** hisobiga kiradi → ulanish avtomatik bajariladi va botga salom keladi.

- Parol **botga emas**, saytning HTTPS sahifasiga kiritiladi.
- Telegram sahifaga `initData` beradi — u **bot tokeni bilan imzolangan**. Server
  imzoni qayta hisoblab tekshiradi (`backend/src/utils/telegramWebApp.js`,
  `HMAC-SHA256`, `timingSafeEqual`), shuning uchun o'zini boshqa Telegram
  foydalanuvchisi qilib ko'rsatib bo'lmaydi.
- `auth_date` 15 daqiqadan eski bo'lsa rad etiladi (eski so'rovni qayta ishlatib
  bo'lmaydi).
- Kim ekanligi JWT dan, qaysi Telegram ekanligi imzolangan `initData` dan olinadi.
- Hisobda boshqa Telegram bo'lgan bo'lsa — almashtiriladi va **eski chatga
  ogohlantirish** yuboriladi.
- Rol tugmasi faqat matnni moslashtiradi — **haqiqiy rol hisobdan olinadi**,
  botdan turib o'ziga ustoz huquqini berib bo'lmaydi.
- ⚠️ Telegram `web_app` tugmasi faqat **HTTPS** manzil bilan ishlaydi. `localhost`
  da bot tugma o'rniga oddiy havola beradi (va nega tugma yo'qligini yozadi) —
  bu oqim jonli saytda sinaladi. Manzil quyidagi tartibda olinadi:
  `PUBLIC_SITE_URL` → `CLIENT_URL` dagi birinchi **HTTPS** manzil → birinchi manzil.
  Ya'ni `CLIENT_URL` da localhost birinchi tursa ham bot HTTPS manzilni tanlaydi.

**2) Saytdan (eski yo'l, saqlanib qolgan).** Profil → "Telegram'ga ulash" → bir
martalik havola (`t.me/<bot>?start=<token>`, 15 daqiqa). Token bazada ochiq
saqlanmaydi (sha256) va bir marta ishlatiladi.

**Tugmalar va buyruqlar.** Asosiy yo'l — xabar maydoni ostidagi doimiy tugmalar
paneli (`backend/src/telegram/keyboard.js`). Panel holatga qarab o'zgaradi:

| Holat | Panel |
|-------|-------|
| Ulanmagan | `🔗 Hisobni ulash` · `🛒 Kurslar` · `❓ Yordam` |
| O'quvchi | `📚 Kurslarim` · `🤖 AI Ustoz` · `🎓 Sertifikatlarim` · `🛒 Kurslar` · `❓ Yordam` |
| Ustoz/admin | yuqoridagilar + `💰 Maoshim` · `👥 O'quvchilarim` |
| AI suhbati ochiq | birinchi qatorda `✖️ Suhbatni tugatish` |

Har bir tugma tegishli buyruq bilan bir xil kodga boradi — buyruq yozib ham
ishlatsa bo'ladi:

| Buyruq | Tugma | Nima qiladi |
|--------|-------|-------------|
| `/ulash` | `🔗 Hisobni ulash` | Hisobni botning o'zidan ulash menyusi |
| `/kurslar` | `🛒 Kurslar` | Barcha ochiq kurslar: kategoriya, narx, daraja va havola (hisobsiz ham ishlaydi) |
| `/kurslarim` | `📚 Kurslarim` | Kurslar, progress chizig'i va kirish muddati |
| `/sertifikatlarim` | `🎓 Sertifikatlarim` | Olingan sertifikatlar: kurs, raqam, sana va yuklab olish havolasi |
| `/ustoz` | `🤖 AI Ustoz` | AI Ustoz bilan suhbat (quyida) |
| `/tugat` | `✖️ Suhbatni tugatish` | AI suhbatini yakunlash |
| `/maosh` | `💰 Maoshim` | Shu oy ulushi, jami/to'langan/qoldiq, kurslar kesimi |
| `/oquvchilarim` | `👥 O'quvchilarim` | Yozilishlar, holat kesimi, o'rtacha progress |
| `/yordam` | `❓ Yordam` | Ro'yxat (rolga qarab) |
| `/kunlik` | — | Kunlik progress eslatmasini yoqish/o'chirish |
| `/uzish` | — | Hisobni botdan uzish (panel ulash holatiga qaytadi) |

> Tugma bosilganda Telegram uning **matnini** oddiy xabar sifatida yuboradi.
> Shuning uchun matn yo'naltirishda tugma yozuvlari **AI suhbatidan oldin**
> tekshiriladi — aks holda "📚 Kurslarim" savol sifatida AI ga ketib qolardi.

**Kurslar katalogi.** `🛒 Kurslar` — faqat **nashr etilgan** (`published`) kurslar,
kategoriya bo'yicha guruhlangan: narx (yoki `🆓 Bepul`), daraja va "Batafsil"
havolasi. Foydalanuvchi allaqachon yozilgan kurslar `✅` bilan belgilanadi.
Katalog ochiq ma'lumot — hisob ulanmagan bo'lsa ham ko'rinadi. Ro'yxat uzun
bo'lsa xabar bir necha bo'lakka bo'linadi (`format.js:chunkLines`) — Telegram'ning
4096 belgi chegarasidan oshib, xabar jimgina yo'qolib qolmasligi uchun.

**Sertifikatlar.** Bot faqat ulangan hisobning sertifikatlarini ko'rsatadi (kurs
nomi, raqam, berilgan sana) va har biriga `⬇️` yuklab olish tugmasini beradi.
Tugma sayt sahifasini (`/certificates/<id>`) ochadi — u yerda "Sertifikatni chop
etish / PDF" tugmasi bor. Sertifikat sahifasi havola bo'yicha ochiq (raqam
bo'yicha tekshirish uchun shunday), shuning uchun yuklab olishda qayta kirish
talab qilinmaydi. Sertifikat kurs 100% tugatilganda avtomatik beriladi.

Ustoz buyruqlari faqat `INSTRUCTOR` va `ADMIN` rollariga ochiq va `/yordam`
ro'yxatida ham faqat ularga ko'rinadi. Ustoz o'ziga biriktirilgan kurslar
kesimini, bosh admin butun platforma kesimini oladi. Botda o'quvchilarning
shaxsiy ma'lumotlari (email, to'lov tafsiloti) ko'rsatilmaydi — faqat sonlar.

### AI Ustoz bot ichida

`/ustoz` — kursga yozilgan o'quvchi savolini to'g'ridan-to'g'ri Telegram'dan
so'raydi. Bir nechta ochiq kursi bo'lsa tugmalardan birini tanlaydi, keyin
oddiy xabar yozsa — javob keladi.

- Javob sayt mentori bilan **bir xil qoidalar** asosida beriladi
  (`backend/src/utils/aiMentor.js`): faqat o'zbekcha, faqat shu kurs doirasida,
  foydalanuvchi matni ko'rsatma emas — ma'lumot sifatida qabul qilinadi.
- Kirish huquqi **har savolda** qayta tekshiriladi — suhbat davomida kurs
  muddati tugasa, suhbat yopiladi.
- Suhbat 30 daqiqa jimlikdan keyin avtomatik yakunlanadi; tarix xotirada
  saqlanadi (server qayta yuklansa suhbat yangidan boshlanadi).
- Chegara: bir foydalanuvchi soatiga 20 ta savol.
- Savollar `AiUsage` jadvaliga yoziladi — admin AI panelidagi analitika sayt va
  bot so'rovlarini birga ko'rsatadi.
- Javob markdown'dan Telegram HTML'ga aylantiriladi (kod bloklari saqlanadi) va
  4096 belgidan uzun bo'lsa bir necha xabarga bo'linadi.

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

### Kunlik progress eslatmasi

`backend/src/jobs/dailyProgress.js` — kuniga **bir marta va bitta xabar**:
tugatilmagan kurslar bo'yicha progress foizi, qolgan kunlar va "▶️ Davom
ettirish" havolasi.

- **Kimga:** hisobini botga ulagan, kursga yozilgan, lekin **sertifikat
  olmagan** va **muddati tugamagan** foydalanuvchiga.
- **Kimga yo'q:** barcha kurslarini tugatganlarga (har biriga sertifikat
  olganlarga), muddati o'tganlarga, `/kunlik` bilan o'chirganlarga, hamda
  progress 100% bo'lib sertifikat hali berilmagan o'tkinchi holatda.
- **Qachon:** Toshkent vaqti bilan 10:00 dan keyingi birinchi tekshiruvda
  (soatiga bir marta tekshiriladi). Server o'sha payt o'chiq bo'lsa, kun
  davomida ko'tarilganda yuboriladi — kuniga bittadan oshmaydi
  (`User.progressPingAt`).
- **O'chirish:** `/kunlik` (holat `User.progressPingOff` da saqlanadi).
- Xabar faqat Telegram'ga boradi — sayt bildirishnomalari va email har kuni
  to'lib ketmasligi uchun `notify.js` orqali o'tmaydi.

**Rejim:** ommaviy manzil bo'lsa (Railway — `RAILWAY_PUBLIC_DOMAIN` avtomatik)
webhook, lokalda polling. Webhook so'rovlari maxfiy sarlavha bilan tekshiriladi.

## Ma'lumotlar bazasi: o'sish va tezlik

### Cheksiz o'sadigan jadvallar va tozalash

`backend/src/jobs/dbCleanup.js` kuniga bir marta vaqtinchalik yozuvlarni
o'chiradi. Muddatlar shu faylning boshida — kerak bo'lsa o'zgartiring:

| Jadval | Nima o'chadi | Muddat |
|--------|--------------|--------|
| `VerificationCode` | muddati o'tgan tasdiqlash kodlari | 1 kun |
| `TelegramLink` | ishlatilgan / eskirgan ulash havolalari | 7 kun |
| `Notification` | **faqat o'qilgan** eski bildirishnomalar | 180 kun |
| `AiUsage` | AI so'rovlari tarixi (analitika) | 365 kun |

**Hech qachon o'chirilmaydi:** to'lovlar, daromadlar, o'tkazmalar, sertifikatlar,
yozilishlar, progress va sharhlar — bular hisobot va huquqiy ma'lumot.
O'qilmagan bildirishnoma ham o'chirilmaydi.

Nima uchun muhim: eng tez o'sadigan jadval — `AiUsage` (har savol = bitta qator).
O'rtacha qator ~170 bayt. 1000 faol o'quvchi kuniga 3 tadan savol bersa yiliga
~1.1 mln qator ≈ **0.2 GB**; tozalashsiz bu har yili ortib boradi.

### Indekslar

Auditda topilib qo'shilganlari (`20260813090000_indekslar_va_tozalash`):

| Indeks | Nima uchun |
|--------|------------|
| `Certificate(courseId)` | ustoz paneli, kunlik eslatma va admin hisobotlari kurs kesimida qidiradi |
| `Enrollment(expiresAt)` | muddat ogohlantirishi va kunlik eslatma butun jadvalni skanerlamasin |
| `Notification(userId, createdAt)` | ro'yxat doim shu tartibda o'qiladi (eski `userId` indeksi o'rniga) |
| `Notification(createdAt)` | tozalash vazifasi uchun |
| `User(progressPingOff, progressPingAt)` | kunlik eslatma har soatda shu shart bo'yicha qidiradi |
| `Course(published, createdAt)` | ommaviy kurslar ro'yxati va bot katalogi |

### Sozlamalar keshi

`SiteSetting` qiymatlari (bot tokeni, AI kaliti, email, bosh sahifa) juda
tez-tez o'qiladi — har bot xabari, har AI savoli, har bosh sahifa ochilishi.
`utils/settings.js` ularni 60 soniya keshlaydi va **`setSetting` chaqirilganda
keshni darhol bo'shatadi** — admin paneldagi o'zgarish o'sha zahoti amal qiladi.

### Ma'lum cheklov (hali tuzatilmagan)

Admin va ustoz hisobotlarining bir qismi yozuvlarni **to'liq o'qib, xotirada**
hisoblaydi (`take` chegarasi yo'q):

- `earnings.controller.js` — `myEarnings`, `adminOverview`, CSV eksport
- `teaching.controller.js` — `listStudents`, `getStudentDetail`
- `admin.controller.js` — dashboard statistikasi

Hozirgi hajmda muammo yo'q. Sotuvlar ~50 000 dan, bitta kursdagi o'quvchilar
~5 000 dan oshganda bu sahifalar sekinlashadi va serverning xotirasini yeydi.
Yechim: `groupBy`/`aggregate` bilan hisobni bazaga o'tkazish — Telegram
botidagi `/maosh` shu tarzda qayta yozilgan (`telegram/teacher.js`), o'sha
naqshni shu uch faylga ham qo'llash kerak.

## Rejadagi ishlar

- [ ] **Domenli pochta** — hozir xatlar shaxsiy Gmail'dan ketadi (kuniga ~500 ta
      chegara, jo'natuvchi sifatida shaxsiy manzil ko'rinadi). Domen olingach
      `no-reply@ustoz.uz` ga o'tish: [EMAIL-DOMEN-QOLLANMA.md](EMAIL-DOMEN-QOLLANMA.md)
      (kod o'zgarmaydi — yangi SMTP ma'lumotlari admin paneliga kiritiladi)
- [ ] **Turnstile kalitlari** — CAPTCHA kodi tayyor, Cloudflare'dan kalit olib
      admin panelga qo'yish qoldi
- [ ] **Jonli saytda emailni yoqish** — Railway'da hali mock rejim; admin panel
      → "Aloqa va himoya" bo'limidan SMTP to'ldirilib yoqiladi
- [x] **Telegram bot — 3-bosqich** — AI Ustoz bot ichida, ustoz uchun
      `/maosh` va `/oquvchilarim` buyruqlari

## Litsenziya

Shaxsiy loyiha.
