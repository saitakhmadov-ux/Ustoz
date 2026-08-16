import { SITE_NAME, formatDateUz } from '@/lib/constants';
import { CornerOrnament, Divider, Seal, GuillochePattern } from './ornaments';

// Sertifikat varaqasi.
//
// MUHIM: bu blok ATAYLAB temaga bo'ysunmaydi. Sertifikat — hujjat, qog'oz.
// Kecha rejimida ham u oq qog'oz bo'lib qoladi (to'q sahifada stol ustidagi
// varaqdek ko'rinadi), chunki uni chop etishadi va skrinshot qilishadi.
// Shuning uchun ranglar bu yerda qat'iy — token emas.
const PAPER = '#fffdf7';
const INK = '#191634';
const INK_SOFT = '#5b5680';
const GOLD = '#a8842c';
const RULE = '#2e2867';

export default function CertificateSheet({
  fullName, courseTitle, authorName, serial, issuedAt, verifyUrl,
}) {
  const date = formatDateUz(issuedAt);

  return (
    <div
      className="certificate relative overflow-hidden rounded-2xl"
      style={{ background: PAPER, color: INK, boxShadow: '0 18px 60px rgba(15,12,45,0.28)' }}
    >
      {/* Tashqi oltin chiziq + ichki quyuq hoshiya — "o'yilgan" hujjat hoshiyasi */}
      <div className="absolute inset-[10px] rounded-xl" style={{ border: `1px solid ${GOLD}`, opacity: 0.55 }} />
      <div className="absolute inset-[16px] rounded-lg" style={{ border: `2px solid ${RULE}` }} />
      <div className="absolute inset-[21px] rounded-md" style={{ border: `1px solid ${RULE}`, opacity: 0.35 }} />

      {/* Fon panjarasi — juda past kontrast, matnga xalaqit bermaydi */}
      <div className="absolute inset-[16px] overflow-hidden rounded-lg" style={{ color: RULE, opacity: 0.055 }}>
        <GuillochePattern />
      </div>

      {/* Burchak gulchambarlari */}
      <div className="pointer-events-none absolute inset-[16px]" style={{ color: GOLD }}>
        <CornerOrnament className="absolute left-2 top-2" />
        <CornerOrnament className="absolute right-2 top-2" rotate={90} />
        <CornerOrnament className="absolute bottom-2 right-2" rotate={180} />
        <CornerOrnament className="absolute bottom-2 left-2" rotate={270} />
      </div>

      <div className="relative px-7 py-12 text-center sm:px-14 sm:py-16 md:px-20 md:py-20">
        {/* Boshlik: platforma nomi */}
        <p
          className="font-display text-[13px] font-bold uppercase sm:text-sm"
          style={{ color: RULE, letterSpacing: '0.42em' }}
        >
          {SITE_NAME}
        </p>
        <p className="mt-1 text-[10px] uppercase sm:text-[11px]" style={{ color: INK_SOFT, letterSpacing: '0.3em' }}>
          Onlayn IT ta'lim platformasi
        </p>

        <div className="mt-7 flex justify-center" style={{ color: GOLD }}>
          <Divider />
        </div>

        <h1
          className="mt-6 font-display text-2xl font-bold uppercase sm:text-3xl"
          style={{ color: RULE, letterSpacing: '0.22em' }}
        >
          Sertifikat
        </h1>

        <p className="mt-8 text-sm sm:text-base" style={{ color: INK_SOFT }}>
          Ushbu sertifikat quyidagi shaxsga berildi
        </p>

        {/* Ism — varaqaning eng baland nuqtasi */}
        <p
          className="mt-3 font-display text-[30px] font-bold leading-tight sm:text-[42px] md:text-[52px]"
          style={{ color: INK }}
        >
          {fullName}
        </p>
        <div className="mx-auto mt-4 h-px w-40 sm:w-64" style={{ background: GOLD }} />

        <p className="mt-7 text-sm sm:text-base" style={{ color: INK_SOFT }}>
          va u quyidagi kursni to'liq hamda muvaffaqiyatli tamomlaganini tasdiqlaydi
        </p>
        <p
          className="mx-auto mt-3 max-w-2xl font-display text-lg font-semibold leading-snug sm:text-2xl"
          style={{ color: RULE }}
        >
          «{courseTitle}»
        </p>

        {/* Pastki qator: sana · muhr · o'qituvchi imzosi */}
        <div className="mt-12 grid grid-cols-1 items-end gap-8 sm:grid-cols-3 sm:gap-4">
          <div className="order-2 sm:order-1">
            <div className="mx-auto h-px w-40" style={{ background: INK_SOFT, opacity: 0.5 }} />
            <p className="mt-2 text-[11px] uppercase" style={{ color: INK_SOFT, letterSpacing: '0.18em' }}>
              Berilgan sana
            </p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: INK }}>{date}</p>
          </div>

          <div className="order-1 flex justify-center sm:order-2" style={{ color: GOLD }}>
            <Seal />
          </div>

          <div className="order-3">
            <div className="mx-auto h-px w-40" style={{ background: INK_SOFT, opacity: 0.5 }} />
            <p className="mt-2 text-[11px] uppercase" style={{ color: INK_SOFT, letterSpacing: '0.18em' }}>
              Kurs muallifi
            </p>
            <p className="mt-0.5 text-sm font-semibold" style={{ color: INK }}>
              {authorName || SITE_NAME}
            </p>
          </div>
        </div>

        {/* Tekshiruv ma'lumoti — hujjatning "haqiqiylik" qatori */}
        <div
          className="mx-auto mt-11 max-w-xl rounded-lg px-4 py-3"
          style={{ background: 'rgba(46,40,103,0.045)', border: `1px solid rgba(46,40,103,0.14)` }}
        >
          <p className="text-[10px] uppercase" style={{ color: INK_SOFT, letterSpacing: '0.22em' }}>
            Sertifikat raqami
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wider" style={{ color: INK }}>
            {serial}
          </p>
          {verifyUrl && (
            <p className="mt-1.5 break-all font-mono text-[10px]" style={{ color: INK_SOFT }}>
              {verifyUrl}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
