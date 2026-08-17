import './globals.css';
import { Bricolage_Grotesque, Work_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/auth';
import { SITE_NAME } from '@/lib/constants';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

// Indigo Modern dunyosi — Bricolage Grotesque (sarlavha) + Work Sans (tana).
//
// Sarlavha shrifti ataylab xarakterli tanlangan: oldingi Outfit toza, lekin
// juda koʻp SaaS saytida uchraydi — sayt "anonim" koʻrinardi.
//
// `latin` qismi oʻzbekcha `ʻ` (U+02BB) va `ʼ` (U+02BC) belgilarini qamraydi
// (unicode-range: U+2BB-2BC), shuning uchun `oʻ`/`gʻ` toʻgʻri chiziladi.
//
// MUHIM: bu yerdagi `variable` nomlari tailwind.config.js dagi fontFamily
// bilan mos boʻlishi shart, aks holda `font-display` klassi jimgina ishlamaydi.
const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata = {
  title: {
    default: `${SITE_NAME} — Onlayn IT taʼlim platformasi`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Oʻzbek tilidagi onlayn IT taʼlim platformasi. Frontend, Backend, Mobile, DevOps va boshqa yoʻnalishlarda zamonaviy kurslar.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className={`${workSans.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        {/* Temani sahifa chizilishidan oldin qoʻllaydi — kecha rejimida oq
            chaqnash (FOUC) boʻlmasligi uchun. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
