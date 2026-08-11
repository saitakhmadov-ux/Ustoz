# Email: shaxsiy Gmail'dan domenli pochtaga o'tish

> **Bu — kelajak uchun eslatma.** Hozir bajarish shart emas. Haqiqiy hosting va
> domen olinganda shu hujjatni ochib, qadamlarni ketma-ket bajarish kifoya.
>
> Oxirgi yangilanish: 2026-08-11

---

## Hozirgi holat (qayerda to'xtaganmiz)

| Nima | Holat |
|------|-------|
| Lokal SMTP (Gmail) | ✅ Ishlayapti — `npm run mail:test` muvaffaqiyatli, xat Inbox'ga tushdi (Spam emas) |
| Ro'yxatdan o'tish kodi | ✅ Haqiqiy pochtaga boradi |
| Parolni tiklash kodi | ✅ Ishlayapti |
| Railway (jonli sayt) | ❌ **Hali sozlanmagan** — `EMAIL_MOCK` yoqilgan, kodlar faqat logga chiqadi |
| Turnstile CAPTCHA | ❌ Kalit qo'yilmagan |
| Domen | ❌ Yo'q — hozir Vercel subdomenida |

Jo'natuvchi: `Ustoz <saitakhmadov@gmail.com>` (shaxsiy Gmail).

---

## Nega o'tish kerak

Shaxsiy Gmail bilan ishlayveradi, lekin uchta cheklovi bor:

1. **Ishonch** — foydalanuvchi xatda shaxsiy Gmail manzilini ko'radi. Bank yoki
   ta'lim platformasidan kelgan xat `...@gmail.com` dan kelsa, odam ikkilanadi.
2. **Hajm** — bepul Gmail kuniga taxminan **500 ta** xat yuboradi. Kuniga 100 ta
   yangi foydalanuvchi bo'lsa (ro'yxatdan o'tish + parol tiklash + xabarlar),
   bu chegaraga tez yetiladi. Chegaradan oshsa Google akkauntni vaqtincha bloklaydi.
3. **Yetkazib berish** — domen sizniki bo'lmagani uchun SPF/DKIM yozuvlarini
   nazorat qila olmaysiz. Bugun Inbox'ga tushgan xat ertaga Spam'ga tushishi mumkin.

---

## Qadamlar

### 1-qadam. Domen olish

Avval domen kerak — usiz qolgan qadamlar bajarilmaydi.

- **.uz domeni** — mahalliy registratorlar orqali (masalan `ahost.uz`, `uzinfocom`).
  O'zbekistonda tanish va ishonchli ko'rinadi. Ro'yxatdan o'tish uchun hujjat talab
  qilinishi mumkin.
- **.com / .io** — xalqaro registratorlar (Namecheap, Cloudflare Registrar).
  Tezroq va arzonroq, hujjat kerak emas.

Narxlar tez o'zgaradi — buyurtma paytida aniqlashtiring.

> **Maslahat:** domenni Cloudflare'da boshqarish qulay — DNS yozuvlarini qo'shish
> oson va bepul. Boshqa registratordan olsangiz ham, nameserver'ni Cloudflare'ga
> yo'naltirish mumkin.

### 2-qadam. Email xizmatini tanlash

| Xizmat | Bepul chegara | Sozlash | Kimga mos |
|--------|---------------|---------|-----------|
| **Resend** | oyiga 3 000 xat | Eng oson, dasturchilar uchun | ⭐ Boshlash uchun eng yaxshi |
| **Brevo** (eski Sendinblue) | kuniga 300 xat | O'rtacha, panel boy | Marketing xatlari ham kerak bo'lsa |
| **Mailgun** | 1 oy sinov, keyin pullik | O'rtacha | Katta hajm |
| **Google Workspace** | Bepul emas (~$6/oy/foydalanuvchi) | Oson | `@ustoz.uz` da to'liq pochta qutisi ham kerak bo'lsa |

**Tavsiya:** boshida **Resend** — oyiga 3 000 xat hozirgi hajm uchun ortig'i bilan
yetadi va sozlash 15 daqiqa oladi.

> Muhim farq: Resend/Brevo/Mailgun — faqat **yuborish** uchun. Ular sizga
> `no-reply@ustoz.uz` dan yuborish imkonini beradi, lekin `info@ustoz.uz` ga
> **kelgan** xatlarni o'qish uchun pochta qutisi bermaydi. Kelgan xat ham kerak
> bo'lsa — Google Workspace yoki Zoho Mail (bepul tarifi bor).

### 3-qadam. Domenni tasdiqlash (DNS yozuvlari)

Xizmatga ro'yxatdan o'tib, domeningizni qo'shasiz. Xizmat sizga **aniq DNS
yozuvlarini** beradi — ularni domen boshqaruv panelida qo'shasiz.

Uch turdagi yozuv bo'ladi:

| Yozuv | Vazifasi | Misol ko'rinishi |
|-------|----------|------------------|
| **SPF** (TXT) | "Shu serverlarga mening nomimdan yuborishga ruxsat" | `v=spf1 include:...  ~all` |
| **DKIM** (TXT yoki CNAME) | Har bir xatga raqamli imzo qo'yadi — soxtalashtirib bo'lmaydi | Uzun kalit, xizmat beradi |
| **DMARC** (TXT) | SPF/DKIM o'tmagan xat bilan nima qilishni aytadi | `v=DMARC1; p=none; rua=mailto:siz@domen.uz` |

**Yozuvlarni o'zingiz o'ylab topmang** — xizmat panelida "Add domain" bosganingizda
nusxa olish uchun tayyor holda chiqadi.

DMARC uchun boshlang'ich qiymat `p=none` bo'lsin — bu "hech narsani bloklama, faqat
hisobot yubor" degani. Bir-ikki hafta hisobotni kuzatib, hammasi joyida bo'lsa
`p=quarantine`, keyin `p=reject` ga o'tasiz.

DNS yozuvlari tarqalishi **15 daqiqadan 24 soatgacha** vaqt oladi. Xizmat panelida
"Verified" yozuvi paydo bo'lishini kuting.

### 4-qadam. SMTP ma'lumotlarini olish

Domen tasdiqlangach, xizmat panelidan **SMTP credentials** bo'limini oching.
Odatda shunday ko'rinadi:

```
Host: smtp.resend.com
Port: 587
User: resend
Pass: re_xxxxxxxxxxxxxxxxxxxx
```

Bu parolni saqlab qo'ying — ko'pincha bir marta ko'rsatiladi.

### 5-qadam. Loyihada almashtirish

**Kod umuman o'zgarmaydi.** Faqat muhit o'zgaruvchilari almashadi.

Lokal — [`backend/.env`](backend/.env):

```bash
EMAIL_MOCK=false
EMAIL_FROM="Ustoz <no-reply@ustoz.uz>"
SMTP_HOST="smtp.resend.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="resend"
SMTP_PASS="re_xxxxxxxxxxxxxxxxxxxx"
```

Railway (jonli sayt) — **Variables** bo'limida xuddi shu 6 tasi.

> ⚠️ Railway'da qiymatlarni **qo'shtirnoqsiz** yozing. `.env` faylida qo'shtirnoq
> kerak, Railway'da esa u qiymatning bir qismi bo'lib qoladi.

`EMAIL_FROM` dagi domen tasdiqlangan domen bilan bir xil bo'lishi shart — aks
holda xizmat xatni rad etadi.

### 6-qadam. Tekshirish

```bash
cd backend && npm run mail:test siz@gmail.com
```

Skript ulanish va parolni tekshiradi, keyin sinov xatini yuboradi. Xato bo'lsa
sababini o'zbekcha tushuntiradi.

Keyin jonli saytda haqiqiy ro'yxatdan o'tishni sinang va Railway logida shu
qatorni tekshiring:

```
📧 Email: smtp.resend.com:587 orqali yuboriladi (resend)
```

### 7-qadam. Yetkazib berish sifatini o'lchash

[mail-tester.com](https://www.mail-tester.com) ni oching — u sizga vaqtinchalik
manzil beradi. `npm run mail:test <o'sha manzil>` bilan xat yuboring va sahifada
bahoni ko'ring.

**10 dan 8 va undan yuqori** bo'lsa yaxshi. Past bo'lsa sabablari ro'yxatda
ko'rsatiladi (ko'pincha DKIM yoki DMARC yetishmaydi).

---

## Orqaga qaytish rejasi

Yangi xizmat ishlamay qolsa, `.env` / Railway'dagi `SMTP_*` qiymatlarini eski
Gmail sozlamasiga qaytarish kifoya — kod o'zgarmagani uchun darhol ishlaydi:

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="saitakhmadov@gmail.com"
SMTP_PASS="<Gmail App password>"
EMAIL_FROM="Ustoz <saitakhmadov@gmail.com>"
```

Eski App password'ni o'chirib yubormang — zaxira sifatida qolsin.

---

## Buni admin paneliga chiqarish (kelajak g'oyasi)

Hozir email sozlamasi `.env` va Railway Variables'da. Har o'zgartirishda deploy
kerak. Loyihada allaqachon shunga o'xshash yechim bor: **Ustoz AI** sozlamalari
(`ai_config`) bazada saqlanadi va admin panelidan o'zgartiriladi — deploy'siz.

Xuddi shu naqshni email uchun ham qo'llash mumkin:

- **Admin → Sozlamalar → Email** bo'limi
- Maydonlar: jo'natuvchi nomi, SMTP host/port/secure/user/pass
- **"Sinov xati yuborish"** tugmasi — hozirgi `npm run mail:test` skriptining
  brauzerdagi ko'rinishi
- Holat ko'rsatkichi: mock / ishlayapti / xato
- Parol bazada saqlanadi va panelda faqat oxirgi belgilari ko'rsatiladi

Shunda xizmat almashtirish (Gmail → Resend) **kod va deploy'siz**, admin panelidan
5 daqiqada bajariladi. Tayyor bo'lganda ayting — `AI` bo'limi qanday qilingan
bo'lsa, xuddi shunday qilamiz.
