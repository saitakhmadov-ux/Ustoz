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
