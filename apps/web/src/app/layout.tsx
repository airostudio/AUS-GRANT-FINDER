import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AusGrant-Automate | AI-Powered Grant & Tender Engine',
  description:
    'Automate Australian government tender and grant applications with AI-powered writing and submission.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
