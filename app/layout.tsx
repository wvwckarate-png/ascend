import type { Metadata } from "next";
import Script from 'next/script';
import RDKitLoader from './components/RDKitLoader';
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Ascend — Forged in Focus",
  description: "Your personal study ecosystem",
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ascend',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      
      <body className={jakarta.variable}>
        <Script
          src="https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js"
          strategy="afterInteractive"
        />
        <RDKitLoader />
        {children}
      </body>
    </html>
  );
}