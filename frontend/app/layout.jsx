import './globals.css';
import { Outfit, Work_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/auth';
import { SITE_NAME } from '@/lib/constants';

// Indigo Modern dunyosi — Outfit (display) + Work Sans (body)
const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata = {
  title: {
    default: `${SITE_NAME} — Onlayn IT ta'lim platformasi`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "O'zbek tilidagi onlayn IT ta'lim platformasi. Frontend, Backend, Mobile, DevOps va boshqa yo'nalishlarda zamonaviy kurslar.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={`${workSans.variable} ${outfit.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
