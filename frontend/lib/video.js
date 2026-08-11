// Video URL'ni embed (iframe) manziliga aylantirish
export function getEmbedUrl(url) {
  if (!url) return null;
  try {
    // YouTube
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

    // Vimeo
    const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;

    return url; // to'g'ridan-to'g'ri (mp4 yoki embed)
  } catch {
    return url;
  }
}

// Havola to'g'ridan-to'g'ri video fayl (mp4/webm) ekanligini aniqlash
export function isDirectVideo(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url || '');
}

// ---- "Biz haqimizda" sahifasi uchun ----
// Yuqoridagi ikkitasi dars videolari uchun ishlatiladi va tanilmagan havolani
// ham qaytaraveradi. Bu yerda esa admin kiritgan havolaga ishonib bo'lmaydi,
// shuning uchun tur aniq ajratiladi va noma'lum havola iframe'ga berilmaydi.

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/i;
const FILE_EXT = /\.(mp4|webm|mov|mkv|ogg)(\?.*)?$/i;

// Qaytaradi: { kind: 'embed'|'file'|'none', src }
export function videoEmbed(url) {
  const raw = (url || '').trim();
  if (!raw) return { kind: 'none', src: '' };

  const yt = raw.match(YOUTUBE_ID);
  if (yt) return { kind: 'embed', src: `https://www.youtube.com/embed/${yt[1]}` };

  const vm = raw.match(VIMEO_ID);
  if (vm) return { kind: 'embed', src: `https://player.vimeo.com/video/${vm[1]}` };

  // Yuklangan fayl (/uploads/...) yoki to'g'ridan-to'g'ri video havolasi
  if (raw.startsWith('/uploads/') || FILE_EXT.test(raw)) return { kind: 'file', src: raw };

  // Tanib bo'lmagan havolani iframe'ga bermaymiz — noto'g'ri sahifa yuklanmasin
  return { kind: 'none', src: '' };
}
