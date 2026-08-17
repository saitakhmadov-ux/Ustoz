/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev server ishlab turganda ham ishlab chiqarish build'ini sinash uchun:
  // NEXT_DIST_DIR=.next-build npm run build — ikki jarayon bir papkani
  // talashmaydi. O'rnatilmasa oddiy `.next` ishlatiladi.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Kurs thumbnaillari uchun tashqi rasm manbalari
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
