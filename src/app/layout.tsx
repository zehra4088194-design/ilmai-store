import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-poppins", display: "swap" });
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
    <html lang="en" className={`${poppins.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
