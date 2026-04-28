import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.printflow.co.in"),
  title: {
    default: "PrintFlow - Printing Business Management",
    template: "%s | PrintFlow"
  },
  description: "Complete printing business management solution with order tracking, customer management, GST compliance, and billing. Built specifically for modern print shops.",
  keywords: [
    "print shop management software",
    "printing press software India",
    "GST billing for printing press",
    "print order tracking system",
    "printing business management",
    "print shop invoice software",
    "WhatsApp billing for printers",
    "printing press ERP"
  ],
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: "PrintFlow - Premium Print Shop Management",
    description: "Streamline your printing business with automated GST billing, WhatsApp notifications, and centralized order tracking. Join other print shops upgrading to PrintFlow.",
    url: "https://www.printflow.co.in",
    siteName: "PrintFlow",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrintFlow - Printing Business Management",
    description: "Streamline your printing business with automated GST billing, WhatsApp notifications, and centralized order tracking.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { LanguageProvider } from "@/lib/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
