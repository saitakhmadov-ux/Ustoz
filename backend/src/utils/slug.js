// Matndan slug yasash (o'zbekcha/lotin harflar uchun soddalashtirilgan)
function slugify(text) {
  const map = {
    'ʼ': '', "'": '', 'ʻ': '',
    'ā': 'a', 'ō': 'o', 'ū': 'u',
    ' ': '-',
  };
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[ʼ'ʻ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '') // faqat lotin harf/raqam qoldiramiz
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Noyob slug yaratish (agar band bo'lsa raqam qo'shadi)
async function uniqueSlug(base, checkExists) {
  let slug = slugify(base) || 'element';
  let candidate = slug;
  let i = 1;
  // checkExists(slug) => true agar band bo'lsa
  while (await checkExists(candidate)) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  return candidate;
}

module.exports = { slugify, uniqueSlug };
