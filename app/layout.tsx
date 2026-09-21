import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/authcontext';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SmartSpace - Coworking Space & Smart Workstation',
  description: 'Sistem aplikasi reservasi coworking space dan workstation cerdas modern.',
  icons: {
    icon: '/icon.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={sans.variable} suppressHydrationWarning>
      <body className={`${sans.className} antialiased selection:bg-[#2D3328] selection:text-white`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}