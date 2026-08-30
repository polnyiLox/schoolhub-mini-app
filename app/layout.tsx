import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import './globals.css';

export const metadata: Metadata = {
  title: 'SchoolHub — школа в одном месте',
  description: 'Расписание, домашние задания и события вашего класса в Telegram.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f5ef',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
