import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "IlmAI Store | Official Study Notes, Courses & Digital Products",
  description: "The official store of the IlmAI education platform for study notes, courses, test series, and educational products.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_STORE_URL ?? "https://ilmai.store"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "IlmAI Store | Official Study Notes, Courses & Digital Products",
    description: "The official store of the IlmAI education platform for study notes, courses, test series, and educational products.",
    type: "website",
    url: process.env.NEXT_PUBLIC_STORE_URL ?? "https://ilmai.store",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
