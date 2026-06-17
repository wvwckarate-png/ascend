import type { Metadata } from "next";
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
      <head>
        <script
          src="https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js"
        />
      </head>
      <body className={jakarta.variable}>
        <RDKitLoader />
        {children}
      </body>
    </html>
  );
}