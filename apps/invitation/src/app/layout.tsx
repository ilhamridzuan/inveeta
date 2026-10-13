import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inveeta — Undangan Digital Elegan & Modern',
  description:
    'Platform undangan pernikahan digital interaktif dengan pengalaman personal dan realtime.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
