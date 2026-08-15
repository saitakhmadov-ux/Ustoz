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
| **Bosh sahifa** | Hero rasmlari, matnlar, "Biz haqimizda" va "Kontaktlar" sahifalari |
| **Aloqa va himoya** → Email (SMTP) | Jo'natuvchi, SMTP server/port/SSL, login-parol, mock rejim, sinov xati |
| **Aloqa va himoya** → Telegram bot | Bot tokeni, yoqish/o'chirish, sinov xabari, ulangan hisoblar soni |
| **Aloqa va himoya** → CAPTCHA | Cloudflare Turnstile ommaviy va maxfiy kalitlari |

**"Kontaktlar" sahifasi** (`Bosh sahifa` → `Kontaktlar`): sarlavha, aloqa
kartochkalari (nomi, qiymati, ikonka va ixtiyoriy havola — ko'pi bilan 10 ta),
ish vaqti, Google Maps xaritasi va aloqa formasining ko'rinishi. Havolalar
serverda tekshiriladi: faqat `https://`, `mailto:`, `tel:` va sayt ichidagi
manzillar qabul qilinadi (`javascript:` kabi sxemalar tashlab yuboriladi),
xarita esa faqat `https://` bo'lishi mumkin. Sahifadagi forma hozircha **namuna**
— xabar hech qayerga yuborilmaydi, shuning uchun uni panel orqali yashirsa
bo'ladi.

Qoida: paneldagi qiymat `.env` dan ustun turadi. Email uchun panelda SMTP
serveri ko'rsatilsa, butun SMTP bloki (port, login, parol) ham paneldan olinadi;
maydon bo'sh qoldirilsa `.env` qiymatlariga qaytadi. Parol/maxfiy kalitlar
panelga niqoblangan holda qaytariladi va bo'sh yuborilsa o'zgarmaydi.

> Sinov xati mock rejimni chetlab o'tadi — "Haqiqiy xat yuborish" ni yoqishdan
> oldin sozlamani tekshirib olish mumkin. Terminaldan: `npm run mail:test [email]`

## Klaviatura mashqi kursi (typing)

`Course.kind` maydoni kursning turini bildiradi: `STANDARD` (video, matn, test)
yoki **`TYPING`** — klaviaturada tez yozishni o'rgatuvchi kurs. Typing kursi
alohida tizim emas, oddiy kurs: katalog, bepul yozilish, qulflar kaskadi,
progress foizi, sertifikat va Telegram xabarlari o'zgarishsiz ishlaydi.
Boshqaruvi ham odatdagidek — admin panel → **Kurslar**.

Farqi ikki joyda: darsda video/test o'rniga **mashq matni** (`TypingDrill`)
turadi va `/learn/<slug>` sahifasi mashq pleerini chizadi.

**Tayyor kurs:** `npm run db:seed:typing` — "Klaviaturada tez yozish"
(7 bo'lim, 51 dars, bepul). Skript idempotent: qayta ishga tushirilsa mavjud
kursni yangilaydi, hech narsani o'chirmaydi va o'quvchilar progressiga tegmaydi
(shu sababli mazmun kengaytirilganda dars nomlari o'zgartirilmaydi — faqat
yangilari qo'shiladi).

Mazmuni `backend/prisma/typingCourse.js` da: alohida F va J tugmalaridan
boshlanib, asosiy qator → yuqori/pastki qator → butun klaviatura, Shift, tinish
belgilari va raqamlar → oʻ, gʻ, ch, sh, ng va tutuq belgisi → so'zlar va
iboralar → matnlar hamda 30/60 soniyalik tezlik testlari bilan yakunlanadi.

**O'tish sharti.** Har mashqda ikkita maqsad bor: tezlik (so'z/daqiqa) va
aniqlik. Ikkalasiga yetilmasa dars yakunlanmaydi, ammo **qayta urinish
cheklanmagan** (testdagidek kutish muddati yo'q).

**O'zbek lotin yozuvi qoidalari** (`backend/src/utils/typing.js` va uning
brauzerdagi juftligi `frontend/lib/typing.js` — ikkalasi bir xil bo'lishi shart):

- `oʻ`, `gʻ` va tutuq belgisi turli belgilar bilan yoziladi (`ʻ ʼ ' ’ \``) —
  solishtirishda hammasi bittaga keltiriladi, ya'ni klaviaturadagi oddiy `'`
  ham to'g'ri hisoblanadi.
- `WPM = to'g'ri belgilar / 5 / daqiqa`, aniqlik esa yakuniy matn bo'yicha:
  xatoni backspace bilan tuzatsangiz aniqlik tiklanadi, ammo vaqt ketadi.
- Matn `<div>` ichida chiziladi (input emas), shuning uchun nusxa-ko'chirib
  qo'yib bo'lmaydi.

**Natijaga ishonch.** Brauzer yozilgan matnni va davomiylikni yuboradi, server
esa aniqlik va tezlikni **o'zi qaytadan hisoblaydi** (mashq matni bazadan
olinadi). Imkonsiz tezlik (>220 so'z/daqiqa), juda qisqa davomiylik va
o'lchangan vaqtdan uzun davomiylik rad etiladi. Shunga qaramay natija baribir
brauzerdan keladi — maxsus vosita yozgan odam sertifikat ololishi mumkin;
bepul mashq kursi uchun bu maqbul deb hisoblandi.

**Erkin mashq** (`/api/typing/practice`) — Monkeytype uslubidagi vaqtli test:
15/30/60/120 soniya yoki 40/60/100/200 so'z, tasodifiy o'zbek so'zlari
(`backend/src/utils/typingWords.js`), shaxsiy rekord bilan. Matnni server tuzadi
va o'zi tekshiradi. Kurs progressiga ta'sir qilmaydi (`TypingAttempt.lessonId = null`).

**Ekrandagi klaviatura** barmoqlar bo'yicha ranglangan va keyingi bosiladigan
tugmani yoqib turadi; katta harf kerak bo'lsa qarama-qarshi qo'lning Shift
tugmasi ham yonadi.

**Matn maydoni ekranga moslashadi.** Bir qatorga nechta belgi sig'ishi qat'iy
belgilanmagan — pleer maydon ichida ko'rinmas namuna (`MMMM…`) chizib, belgi
kengligini o'lchaydi va `ResizeObserver` bilan oyna o'lchami o'zgarganda qayta
hisoblaydi. Shu sababli matn har qanday kenglikda o'ng chetgacha to'ladi, shrift
esa ekran bilan birga o'sadi (20px → 24px → 30px). Maydon balandligi doim uch
qatorga teng — matn qisqa bo'lsa ham sahifa "sakramaydi".

> Mobil qurilmada mashq ishlaydi, ammo pleer "bu mashq kompyuter klaviaturasi
> uchun" degan ogohlantirish ko'rsatadi va klaviatura tasvirini yashiradi.

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

### Ro'yxatdan o'tishni Telegram orqali tasdiqlash

Email kodi kelmasa (spam papkasi, Gmail'ning kunlik ~500 chegarasi), tasdiqlash
sahifasida **"Telegram orqali tasdiqlash"** tugmasi bor: bir martalik `t.me`
havolasi ochiladi, odam botda "Start" bosadi — hisob **shu zahoti tasdiqlanadi**,
ayni paytda botga ham ulanadi, sahifa esa o'zi kirib ketadi.

- Havolani olish uchun **`pendingToken`** kerak — u ro'yxatdan o'tishda yoki
  tasdiqlanmagan hisob bilan **parol kiritib kirganda** beriladi. Ya'ni havolani
  faqat parolni bilgan odam ola oladi; aks holda begona odam birovning yangi
  hisobini o'z Telegramiga ulab olishi mumkin bo'lardi.
- `pendingToken` ichida `scope: 'verify'` bor va `protect` middleware **scope'li
  tokenni rad etadi** — u seans tokeni o'rniga ishlatilmaydi. Muddati 30 daqiqa.
- Brauzer natijani `pollKey` bilan so'rab turadi (3 soniyada bir, 5 daqiqagacha;
  keyin "Tekshirish" tugmasi qoladi). Kalit **bir martalik**.
- Havola turi `TelegramLink.purpose` da (`LINK` / `VERIFY`) saqlanadi.

**Parolni tiklash** kodi ham Telegram ulangan bo'lsa **botga** yuboriladi (email
o'rniga) — tezroq yetadi va email chegarasini yemaydi. Ulanmagan bo'lsa email
zaxira yo'l bo'lib qoladi.

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
| `/sozlamalar` | — | Qaysi turdagi xabarlar kelishini tanlash (✅/⬜ tugmalar) |
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
| Kursga yangi dars qo'shildi | Kurs o'quvchilari (jamlangan holda) |
| Kursiga yangi o'quvchi yozildi | Ustoz |
| Kursiga yangi sharh qoldirildi | Ustoz |

Admin `Xabarlar` bo'limida qo'lda yuborganda "Telegram botga ham yuborilsin"
belgisi bor. Avtomatik xabarlar **email yubormaydi** — Telegram bepul, email esa
kunlik chegarali; email faqat admin qo'lda tanlaganda ketadi.

**Foydalanuvchi sozlamalari.** Har bir hodisaning kaliti bor
(`backend/src/utils/notifyPrefs.js`); foydalanuvchi kerakmasini profil sahifasida
yoki botda `/sozlamalar` orqali o'chirib qo'yadi (ikkalasi bir joyda saqlanadi:
`User.notifyOff`, kunlik eslatma esa `User.progressPingOff`). Sozlama **faqat
Telegram kanaliga** ta'sir qiladi — sayt ichidagi xabarlar tarixi baribir to'ladi,
aks holda odam to'lov yoki sertifikat yozuvini butunlay yo'qotib qo'yardi. Admin
qo'lda yuborgan xabarlar har doim yetkaziladi (ular hodisa emas).

**Yangi dars xabari** darrov emas, **30 daqiqadan keyin** yuboriladi va bitta kurs
bo'yicha barcha yangi darslar **bitta xabarga** jamlanadi
(`backend/src/jobs/newLessons.js`, soatiga bir marta). Sabab: ustoz darsni bo'sh
yaratib keyin to'ldiradi, va bir o'tirishda 10 ta dars qo'shilsa 10 ta xabar spam
bo'lardi. Har dars uchun bir marta ketadi (`Lesson.announcedAt`); faqat nashr
etilgan kurslar va muddati tugamagan o'quvchilar hisobga olinadi.

### Xabarlar navbati (outbox)

Telegram sekundiga ~30 xabarni qabul qiladi, undan oshsa `429` qaytaradi. Ommaviy
yuborish shuning uchun **`TelegramOutbox` jadvali orqali** ketadi
(`backend/src/jobs/telegramQueue.js`): so'rov darhol tugaydi, vazifa esa sekundiga
20 tadan yuboradi.

- Yuborilgan qator **o'chiriladi** — jadval o'smaydi, tozalash vazifasi kerak emas.
- `429` kelsa Telegram aytgan vaqt kutiladi (butun navbat pauza qiladi).
- Bot bloklangan / chat topilmagan bo'lsa qayta urinilmaydi va foydalanuvchining
  Telegram bog'lanishi tozalanadi.
- Boshqa xatolarda o'sib boruvchi kechikish bilan 5 martagacha urinib ko'riladi.
- Bitta xabar (`notifyUser`) avval **to'g'ridan-to'g'ri** yuboriladi — natija darhol
  bilinsin; faqat vaqtinchalik xato bo'lsa navbatga tushadi.

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
- [x] **Telegram bot — 4-bosqich** — ro'yxatdan o'tishni Telegram orqali
      tasdiqlash, xabarlar navbati (qayta urinish bilan), foydalanuvchi
      bildirishnoma sozlamalari (`/sozlamalar`), yangi dars xabari
- [x] **Klaviatura mashqi kursi** — bepul typing kursi (7 bo'lim, 51 dars),
      erkin mashq rejimi va admin paneldagi mashq tahrirlagichi

## Litsenziya

Shaxsiy loyiha.
