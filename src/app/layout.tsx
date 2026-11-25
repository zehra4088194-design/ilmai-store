import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "IlmAI Pay | Merchant QR Portal",
  description: "Secure merchant access to dynamic JazzCash payment QR codes.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://ilmai.store"),
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
